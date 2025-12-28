import { useState, useEffect } from 'react';
import { getGeographyAnalytics, getLeads, getOrganizations, getIndianStates } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { MapPin, Building2, Target, IndianRupee } from 'lucide-react';

const formatINR = (value) => {
  if (!value) return '₹0';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toLocaleString('en-IN')}`;
};

const STATE_POSITIONS = {
  "Jammu and Kashmir": { x: 280, y: 50 },
  "Ladakh": { x: 320, y: 30 },
  "Himachal Pradesh": { x: 290, y: 90 },
  "Punjab": { x: 260, y: 110 },
  "Chandigarh": { x: 275, y: 115 },
  "Uttarakhand": { x: 330, y: 110 },
  "Haryana": { x: 270, y: 135 },
  "Delhi": { x: 285, y: 145 },
  "Uttar Pradesh": { x: 360, y: 170 },
  "Rajasthan": { x: 220, y: 190 },
  "Gujarat": { x: 170, y: 260 },
  "Madhya Pradesh": { x: 310, y: 250 },
  "Bihar": { x: 450, y: 190 },
  "Jharkhand": { x: 440, y: 230 },
  "West Bengal": { x: 480, y: 250 },
  "Sikkim": { x: 475, y: 175 },
  "Arunachal Pradesh": { x: 560, y: 160 },
  "Assam": { x: 530, y: 190 },
  "Nagaland": { x: 560, y: 195 },
  "Manipur": { x: 555, y: 220 },
  "Mizoram": { x: 540, y: 255 },
  "Tripura": { x: 515, y: 250 },
  "Meghalaya": { x: 510, y: 210 },
  "Odisha": { x: 420, y: 290 },
  "Chhattisgarh": { x: 370, y: 290 },
  "Maharashtra": { x: 260, y: 330 },
  "Telangana": { x: 320, y: 360 },
  "Andhra Pradesh": { x: 340, y: 400 },
  "Karnataka": { x: 270, y: 420 },
  "Goa": { x: 225, y: 400 },
  "Kerala": { x: 260, y: 490 },
  "Tamil Nadu": { x: 310, y: 470 },
  "Puducherry": { x: 335, y: 450 },
};

const Geography = () => {
  const [geoData, setGeoData] = useState({});
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('all');
  const [stateDetails, setStateDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [geoRes, statesRes] = await Promise.all([
        getGeographyAnalytics(),
        getIndianStates()
      ]);
      setGeoData(geoRes.data);
      setStates(statesRes.data.states);
    } catch (error) {
      toast.error('Failed to load geography data');
    } finally {
      setLoading(false);
    }
  };

  const handleStateClick = async (state) => {
    setSelectedState(state);
    if (state === 'all') {
      setStateDetails(null);
      return;
    }
    
    try {
      const [orgsRes, leadsRes] = await Promise.all([
        getOrganizations({ state }),
        getLeads({ state })
      ]);
      setStateDetails({
        state,
        organizations: orgsRes.data,
        leads: leadsRes.data,
        stats: geoData[state] || { organizations: 0, leads: 0, monthly_revenue: 0 }
      });
    } catch (error) {
      toast.error('Failed to load state details');
    }
  };

  const getStateColor = (state) => {
    const data = geoData[state];
    if (!data || data.leads === 0) return 'fill-muted/30';
    if (data.leads >= 10) return 'fill-primary';
    if (data.leads >= 5) return 'fill-primary/70';
    if (data.leads >= 1) return 'fill-primary/40';
    return 'fill-muted/30';
  };

  const totalStats = Object.values(geoData).reduce(
    (acc, state) => ({
      organizations: acc.organizations + (state.organizations || 0),
      leads: acc.leads + (state.leads || 0),
      monthly_revenue: acc.monthly_revenue + (state.monthly_revenue || 0)
    }),
    { organizations: 0, leads: 0, monthly_revenue: 0 }
  );

  const statesWithData = Object.entries(geoData).filter(([_, data]) => data.leads > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div data-testid="geography-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Geography</h1>
          <p className="text-muted-foreground">State-wise distribution of organizations and leads</p>
        </div>
        <Select value={selectedState} onValueChange={handleStateClick}>
          <SelectTrigger className="w-[200px]" data-testid="state-filter">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">All States</SelectItem>
            {states.map(state => (
              <SelectItem key={state} value={state}>{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{totalStats.organizations}</div>
            <p className="text-xs text-muted-foreground">Across {statesWithData.length} states</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Target className="h-4 w-4 text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{totalStats.leads}</div>
            <p className="text-xs text-muted-foreground">Active in pipeline</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-green-400">
              {formatINR(totalStats.monthly_revenue)}
            </div>
            <p className="text-xs text-muted-foreground">From won deals</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>India Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-[4/5] max-h-[600px]">
              <svg viewBox="0 0 650 550" className="w-full h-full">
                {/* India outline (simplified) */}
                <path
                  d="M280,30 L350,30 L380,60 L350,90 L380,120 L340,150 L390,180 L420,160 L480,170 L530,160 L570,180 L560,200 L580,220 L550,260 L510,260 L500,290 L450,300 L420,280 L380,310 L340,290 L300,330 L340,370 L330,410 L350,450 L310,490 L280,520 L240,490 L220,440 L200,380 L230,340 L180,300 L160,250 L200,200 L240,170 L230,130 L260,100 L250,70 Z"
                  className="fill-muted/20 stroke-border"
                  strokeWidth="2"
                />
                
                {/* State markers */}
                {Object.entries(STATE_POSITIONS).map(([state, pos]) => {
                  const data = geoData[state];
                  const hasData = data && (data.leads > 0 || data.organizations > 0);
                  
                  return (
                    <g key={state} onClick={() => handleStateClick(state)} className="cursor-pointer">
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={hasData ? Math.min(8 + (data.leads || 0) * 2, 20) : 6}
                        className={`${hasData ? 'fill-primary hover:fill-primary/80' : 'fill-muted/50'} transition-all`}
                        stroke={selectedState === state ? '#fff' : 'transparent'}
                        strokeWidth="2"
                      />
                      {hasData && (
                        <text
                          x={pos.x}
                          y={pos.y + 4}
                          textAnchor="middle"
                          className="fill-primary-foreground text-[10px] font-bold pointer-events-none"
                        >
                          {data.leads}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              
              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur p-3 rounded-md border border-border">
                <p className="text-xs font-medium mb-2">Legend</p>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span>Has Leads</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-muted/50"></div>
                    <span>No Data</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* State Details / List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>
              {stateDetails ? stateDetails.state : 'States with Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stateDetails ? (
              <div className="space-y-4">
                {/* State Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-2xl font-bold">{stateDetails.stats.organizations}</p>
                    <p className="text-xs text-muted-foreground">Orgs</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-2xl font-bold">{stateDetails.stats.leads}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-lg font-bold text-green-400">{formatINR(stateDetails.stats.monthly_revenue)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>

                {/* Organizations in state */}
                {stateDetails.organizations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Organizations</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {stateDetails.organizations.map(org => (
                        <div key={org.id} className="p-2 rounded border border-border text-sm">
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.city} • {org.type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleStateClick('all')}
                  className="text-sm text-primary hover:underline"
                >
                  ← Back to all states
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {statesWithData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data yet. Add organizations to see state-wise distribution.</p>
                ) : (
                  statesWithData
                    .sort((a, b) => b[1].leads - a[1].leads)
                    .map(([state, data]) => (
                      <div
                        key={state}
                        onClick={() => handleStateClick(state)}
                        className="p-3 rounded-md border border-border hover:border-primary/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{state}</p>
                          <Badge variant="outline">{data.leads} leads</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{data.organizations} orgs</span>
                          <span className="text-green-400">{formatINR(data.monthly_revenue)}/mo</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Geography;
