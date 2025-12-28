import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardAnalytics } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Target, Building2, DollarSign, TrendingUp, 
  Trophy, Percent, Plus, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const STAGE_COLORS = {
  IDENTIFIED: '#6366f1',
  QUALIFIED: '#8b5cf6',
  DEMO: '#a855f7',
  PILOT: '#14b8a6',
  COMMERCIAL: '#f59e0b',
  CLOSED: '#22c55e'
};

const STATUS_COLORS = {
  OPEN: '#6366f1',
  WON: '#14b8a6',
  LOST: '#ef4444'
};

const ORG_TYPE_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899'];

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await getDashboardAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stageData = analytics?.leads_by_stage 
    ? Object.entries(analytics.leads_by_stage).map(([name, value]) => ({ name, value }))
    : [];

  const statusData = analytics?.leads_by_status
    ? Object.entries(analytics.leads_by_status).map(([name, value]) => ({ name, value }))
    : [];

  const orgTypeData = analytics?.leads_by_org_type
    ? Object.entries(analytics.leads_by_org_type).map(([name, value]) => ({ name, value }))
    : [];

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your sales pipeline</p>
        </div>
        <div className="flex gap-2">
          <Link to="/organizations">
            <Button variant="outline" data-testid="add-org-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </Link>
          <Link to="/leads">
            <Button className="glow-primary" data-testid="add-lead-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{analytics?.total_leads || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active in pipeline</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{analytics?.total_organizations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{formatCurrency(analytics?.pipeline_value || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Open opportunities</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{analytics?.win_rate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Conversion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Won (Offered)</CardTitle>
            <Trophy className="h-4 w-4 text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-teal-400">
              {formatCurrency(analytics?.won_offered || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Won (Agreed)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-green-400">
              {formatCurrency(analytics?.won_agreed || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Probability</CardTitle>
            <Percent className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-purple-400">
              {analytics?.avg_probability || 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Leads</CardTitle>
            <Target className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {analytics?.leads_by_status?.OPEN || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis type="number" stroke="#a1a1aa" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0a0a', 
                      border: '1px solid #27272a',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leads by Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Leads by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0a0a', 
                      border: '1px solid #27272a',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leads by Organization Type */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Leads by Organization Type</CardTitle>
            <Link to="/organizations">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orgTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0a0a', 
                      border: '1px solid #27272a',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {orgTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ORG_TYPE_COLORS[index % ORG_TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
