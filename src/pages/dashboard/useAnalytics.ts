import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';

export const useAnalytics = (pluginId?: number) => {
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [ratingSummary, setRatingSummary] = useState<any>(null);
  const [mapData, setMapData] = useState<any[]>([]);
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>('Lifetime');

  const fetchData = useCallback(async (selectedTimeframe: string) => {
    setLoading(true);
    try {
      const params: any = { timeframe: selectedTimeframe };
      if (pluginId) {
        params.plugin_id = pluginId;
      }
      const res = await api.get(`/user/analytics`, { params });
      
      setTimeSeries(Array.isArray(res.data.timeSeries) ? res.data.timeSeries : []);
      setRatingSummary(res.data.ratingSummary || null);
      setMapData(Array.isArray(res.data.mapData) ? res.data.mapData : []);
      setBreakdowns(Array.isArray(res.data.breakdowns) ? res.data.breakdowns : []);
    } catch (error) {
      console.error("Analytics Fetch Error:", error);
      setTimeSeries([]);
      setRatingSummary(null);
      setMapData([]);
      setBreakdowns([]);
    } finally {
      setLoading(false);
    }
  }, [pluginId]);

  useEffect(() => {
    fetchData(timeframe);
  }, [timeframe, fetchData]);

  // Merge multiple plugin entries into single daily totals for the chart
  const processedData = useMemo(() => {
    if (!timeSeries.length) return [];

    const dailyMap = timeSeries.reduce((acc, curr) => {
      const day = curr.date || 'Unknown';
      if (!acc[day]) {
        acc[day] = { date: day, views: 0, downloads: 0, earnings: 0, avgRating: 0, reviewCount: 0, conversionRate: 0 };
      }
      acc[day].views += Number(curr.views || 0);
      acc[day].downloads += Number(curr.downloads || 0);
      acc[day].earnings += Number(curr.earnings || 0);
      if (curr.avgRating > 0) {
        acc[day].avgRating = curr.avgRating;
      }
      acc[day].reviewCount += Number(curr.reviewCount || 0);
      acc[day].conversionRate = acc[day].views > 0
        ? Math.round((acc[day].downloads / acc[day].views) * 1000) / 10
        : 0;
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(dailyMap).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [timeSeries]);
  
  // Calculate global totals across all plugins
  const totals = useMemo(() => {
    const raw = timeSeries.reduce((acc, curr) => {
        acc.views += Number(curr.views || 0);
        acc.downloads += Number(curr.downloads || 0);
        acc.earnings += Number(curr.earnings || 0);
        return acc;
    }, { views: 0, downloads: 0, earnings: 0 });

    const conversionRate = raw.views > 0
      ? Math.round((raw.downloads / raw.views) * 1000) / 10
      : 0;

    return { ...raw, conversionRate };
  }, [timeSeries]);

  return { 
    timeSeries, 
    ratingSummary,
    mapData, 
    breakdowns, 
    processedData, 
    totals, 
    loading, 
    timeframe, 
    setTimeframe, 
    recentActivity: [], 
    trends: { earnings: 0, downloads: 0, conversion: 0 }, 
    refresh: () => fetchData(timeframe) 
  };
};
