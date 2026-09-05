'use client';
import { useEffect,useRef,useState } from 'react';
import { trackEvent } from '../../lib/engagement-client.js';
export default function OpportunityMap({companies,onSelect,onBounds}) {
  const node=useRef(null),map=useRef(null),layer=useRef(null),leaflet=useRef(null),callbacks=useRef({onSelect,onBounds});
  callbacks.current={onSelect,onBounds};
  const [zoom,setZoom]=useState(12);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[moved,setMoved]=useState(false);
  useEffect(()=>{
    let cancelled=false;let instance;setFailed(false);
    const timer=setTimeout(()=>{if(!map.current){setFailed(true);trackEvent('map_error');}},8000);
    import('leaflet').then(async module=>{
      await import('leaflet/dist/leaflet.css');if(cancelled)return;
      const L=module.default;leaflet.current=L;
      instance=L.map(node.current,{center:[17.448,78.39],zoom:12,scrollWheelZoom:false});map.current=instance;
      const key=process.env.NEXT_PUBLIC_STADIA_KEY;
      const tiles=L.tileLayer(`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png${key?'?api_key='+key:''}`,{attribution:'© Stadia Maps © OpenMapTiles © OpenStreetMap',maxZoom:19});
      let errors=0;tiles.on('tileerror',()=>{if(++errors===3){setFailed(true);trackEvent('map_error');}});
      tiles.addTo(instance);layer.current=L.layerGroup().addTo(instance);
      instance.on('dragend zoomend',()=>{setMoved(true);setZoom(instance.getZoom());});setReady(true);
    }).catch(()=>{if(!cancelled){setFailed(true);trackEvent('map_error');}});
    const observer=new ResizeObserver(()=>map.current?.invalidateSize());if(node.current)observer.observe(node.current);
    return()=>{cancelled=true;clearTimeout(timer);observer.disconnect();instance?.remove();map.current=null;setReady(false);};
  },[attempt]);
  useEffect(()=>{
    if(!ready||!layer.current)return;layer.current.clearLayers();const L=leaflet.current;
    const located=companies.filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lng));
    const areas=new globalThis.Map();
    for(const c of located){if(!areas.has(c.area))areas.set(c.area,{name:c.area,area:c.area,count:0,employers:0,lat:0,lng:0,precision:'area',isArea:true});const a=areas.get(c.area);a.count+=c.count;a.employers++;a.lat+=c.lat;a.lng+=c.lng;}
    const markers=zoom<=12?[...areas.values()].map(a=>({...a,lat:a.lat/a.employers,lng:a.lng/a.employers})):located;
    for(const c of markers) {
      const marker=L.marker([c.lat,c.lng],{icon:L.divIcon({className:'op-map-pin',html:`<span>${Number(c.count)}</span>`,iconSize:[36,36]})});
      const label=document.createElement('span');label.textContent=`${c.name} · ${c.count} roles${c.employers?' · '+c.employers+' employers':''} · ${c.precision==='office'?'Verified office':'Approximate area'}`;
      marker.bindTooltip(label);marker.on('click',()=>callbacks.current.onSelect(c));marker.addTo(layer.current);
    }
  },[companies,ready,zoom]);
  return <div className="op-map-wrap"><div className="op-map" ref={node} aria-label="Hiring companies map" />
    {(!ready||failed)&&<div className="op-map-status" role="status">{failed?<><strong>Map unavailable</strong><p>Your job results still work.</p><button onClick={()=>setAttempt(a=>a+1)}>Retry map</button></>:<span>Loading area map…</span>}</div>}
    {moved&&ready&&!failed&&<button className="op-search-area" onClick={()=>{const b=map.current.getBounds();callbacks.current.onBounds({south:b.getSouth(),north:b.getNorth(),west:b.getWest(),east:b.getEast()});setMoved(false);}}>Search this area</button>}
    <p className="op-map-caption">Pins show matching roles. Area locations are approximate.</p>
  </div>;
}
