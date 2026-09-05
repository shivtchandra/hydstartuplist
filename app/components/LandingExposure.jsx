'use client';
import { useEffect } from 'react';
import { trackEvent } from '../../lib/engagement-client.js';
export default function LandingExposure({variant='control'}){useEffect(()=>{trackEvent('landing',variant);},[variant]);return null;}
