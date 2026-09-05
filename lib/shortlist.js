'use client';
export const SHORTLIST_KEY='hyd-shortlist-v1';
export function readShortlist() {try{return JSON.parse(localStorage.getItem(SHORTLIST_KEY))||{jobs:{},companies:[],searches:[]};}catch{return {jobs:{},companies:[],searches:[]};}}
export function writeShortlist(value) {try{localStorage.setItem(SHORTLIST_KEY,JSON.stringify(value));window.dispatchEvent(new Event('hyd-shortlist'));return true;}catch{return false;}}
