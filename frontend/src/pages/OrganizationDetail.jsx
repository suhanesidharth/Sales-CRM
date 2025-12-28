import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOrganization, updateOrganization, getLeads } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Save, Target, Eye } from 'lucide-react';

const ORG_TYPES = ['HOSPITAL', 'NGO', 'GOVT', 'CORPORATE'];

const STAGE_COLORS = {
  IDENTIFIED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  QUALIFIED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DEMO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  PILOT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COMMERCIAL: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  CLOSED: 'bg-green-500/20 text-green-400 border-green-500/30'
};

const OrganizationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    state: '',
    city: ''
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [orgRes, leadsRes] = await Promise.all([
        getOrganization(id),
        getLeads({ organization_id: id })
      ]);
      setOrg(orgRes.data);
      setLeads(leadsRes.data);
      setFormData({
        name: orgRes.data.name,
        type: orgRes.data.type,
        state: orgRes.data.state,
        city: orgRes.data.city
      });
    } catch (error) {
      toast.error('Failed to load organization');
      navigate('/organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrganization(id, formData);
      toast.success('Organization updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div data-testid="org-detail-page" className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/organizations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{org?.name}</h1>
          <p className="text-muted-foreground">Organization details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit Form */}
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="edit-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger data-testid="edit-org-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                data-testid="edit-org-state"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                data-testid="edit-org-city"
              />
            </div>
            <Button onClick={handleSave} className="w-full glow-primary" disabled={saving} data-testid="save-org-button">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Leads ({leads.length})
            </CardTitle>
            <Link to="/leads">
              <Button variant="outline" size="sm">View All Leads</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No leads for this organization yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Lead</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="border-border">
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.lead_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{lead.lead_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STAGE_COLORS[lead.stage]}>
                          {lead.stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.product}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.sales_owner}</TableCell>
                      <TableCell>
                        <Link to={`/leads/${lead.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationDetail;
