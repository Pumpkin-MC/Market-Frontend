import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';

export const useAnalytics = () => {
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [mapData, setMapData] = useState<any[]>([]);
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>('Lifetime');

  const fetchData = useCallback(async (selectedTimeframe: string) => {
    setLoading(true);
    try {
      // PRO TIP: Check if your 'api' instance already prepends '/api'
      // If it doesn't, use '/api/dev/analytics'
      const res = await api.get(`/user/analytics`, { 
        params: { timeframe: selectedTimeframe } 
      });
      
      // Ensure we are accessing the correct keys from your Express res.json
      setTimeSeries(Array.isArray(res.data.timeSeries) ? res.data.timeSeries : []);
      setMapData(Array.isArray(res.data.mapData) ? res.data.mapData : []);
      setBreakdowns(Array.isArray(res.data.breakdowns) ? res.data.breakdowns : []);
    } catch (error) {
      console.error("Analytics Fetch Error:", error);
      // Reset data on error so the UI doesn't show stale/broken stats
      setTimeSeries([]);
      setMapData([]);
      setBreakdowns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(timeframe);
  }, [timeframe, fetchData]);

  // Merge multiple plugin entries into single daily totals for the chart
  const processedData = useMemo(() => {
    if (!timeSeries.length) return [];

    const dailyMap = timeSeries.reduce((acc, curr) => {
      const day = curr.date || 'Unknown';
      if (!acc[day]) {
        acc[day] = { date: day, views: 0, downloads: 0, earnings: 0 };
      }
      acc[day].views += Number(curr.views || 0);
      acc[day].downloads += Number(curr.downloads || 0);
      acc[day].earnings += Number(curr.earnings || 0);
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(dailyMap).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [timeSeries]);
  
  // Calculate global totals across all plugins
  const totals = useMemo(() => {
    return timeSeries.reduce((acc, curr) => {
        acc.views += Number(curr.views || 0);
        acc.downloads += Number(curr.downloads || 0);
        acc.earnings += Number(curr.earnings || 0);
        return acc;
    }, { views: 0, downloads: 0, earnings: 0 });
  }, [timeSeries]);

  return { 
    timeSeries, 
    mapData, 
    breakdowns, 
    processedData, 
    totals, 
    loading, 
    timeframe, 
    setTimeframe, 
    recentActivity: [], // Placeholder for activity feed
    trends: { earnings: 0, downloads: 0, conversion: 0 }, // Placeholder for trend percentages
    refresh: () => fetchData(timeframe) 
  };
};
