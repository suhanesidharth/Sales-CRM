import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLeads, createLead, deleteLead, getOrganizations } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Target, Search, Trash2, Eye, Filter, DollarSign, Calendar } from 'lucide-react';

const STAGES = ['IDENTIFIED', 'QUALIFIED', 'DEMO', 'PILOT', 'COMMERCIAL', 'CLOSED'];
const STATUSES = ['OPEN', 'WON', 'LOST'];

const STAGE_COLORS = {
  IDENTIFIED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  QUALIFIED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DEMO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  PILOT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COMMERCIAL: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  CLOSED: 'bg-green-500/20 text-green-400 border-green-500/30'
};

const STATUS_COLORS = {
  OPEN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  WON: 'bg-green-500/20 text-green-400 border-green-500/30',
  LOST: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('pipeline');
  const [formData, setFormData] = useState({
    lead_name: '',
    organization_id: '',
    product: '',
    offered_price: '',
    agreed_price: '',
    expected_volume: '',
    stage: 'IDENTIFIED',
    probability: 10,
    status: 'OPEN',
    expected_close_date: '',
    sales_owner: '',
    source: '',
    remarks: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterStage, filterStatus]);

  const fetchData = async () => {
    try {
      const params = {};
      if (filterStage && filterStage !== 'all') params.stage = filterStage;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      const [leadsRes, orgsRes] = await Promise.all([
        getLeads(params),
        getOrganizations()
      ]);
      setLeads(leadsRes.data);
      setOrganizations(orgsRes.data);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.lead_name || !formData.organization_id || !formData.product || !formData.sales_owner) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      const data = {
        ...formData,
        offered_price: formData.offered_price ? parseFloat(formData.offered_price) : null,
        agreed_price: formData.agreed_price ? parseFloat(formData.agreed_price) : null,
        expected_volume: formData.expected_volume ? parseInt(formData.expected_volume) : null
      };
      await createLead(data);
      toast.success('Lead created');
      setDialogOpen(false);
      setFormData({
        lead_name: '', organization_id: '', product: '', offered_price: '', agreed_price: '',
        expected_volume: '', stage: 'IDENTIFIED', probability: 10, status: 'OPEN',
        expected_close_date: '', sales_owner: '', source: '', remarks: ''
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to create lead');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await deleteLead(id);
      toast.success('Lead deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.lead_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = filteredLeads.filter(l => l.stage === stage);
    return acc;
  }, {});

  return (
    <div data-testid="leads-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Manage your sales pipeline</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary" data-testid="create-lead-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lead Name *</Label>
                  <Input
                    value={formData.lead_name}
                    onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })}
                    placeholder="Lead name"
                    data-testid="lead-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organization *</Label>
                  <Select value={formData.organization_id} onValueChange={(v) => setFormData({ ...formData, organization_id: v })}>
                    <SelectTrigger data-testid="lead-org-select">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Input
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    placeholder="Product/Service"
                    data-testid="lead-product-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sales Owner *</Label>
                  <Input
                    value={formData.sales_owner}
                    onChange={(e) => setFormData({ ...formData, sales_owner: e.target.value })}
                    placeholder="Sales owner name"
                    data-testid="lead-owner-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Proposed Price</Label>
                  <Input
                    type="number"
                    value={formData.proposed_price}
                    onChange={(e) => setFormData({ ...formData, proposed_price: e.target.value })}
                    placeholder="0"
                    data-testid="lead-price-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Volume</Label>
                  <Input
                    type="number"
                    value={formData.expected_volume}
                    onChange={(e) => setFormData({ ...formData, expected_volume: e.target.value })}
                    placeholder="0"
                    data-testid="lead-volume-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Probability %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                    data-testid="lead-probability-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                    <SelectTrigger data-testid="lead-stage-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger data-testid="lead-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Close</Label>
                  <Input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    data-testid="lead-close-date-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Lead source"
                    data-testid="lead-source-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Additional notes"
                    data-testid="lead-remarks-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="glow-primary" data-testid="lead-submit-button">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="lead-search-input"
          />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-[150px]" data-testid="lead-filter-stage">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]" data-testid="lead-filter-status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList className="bg-muted">
          <TabsTrigger value="pipeline" data-testid="view-pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="list" data-testid="view-list">List</TabsTrigger>
        </TabsList>

        {/* Pipeline View */}
        <TabsContent value="pipeline" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {STAGES.map((stage) => (
                <div key={stage} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={STAGE_COLORS[stage]}>
                      {stage}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {leadsByStage[stage].length}
                    </span>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {leadsByStage[stage].map((lead) => (
                      <Card 
                        key={lead.id} 
                        className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
                        data-testid={`lead-card-${lead.id}`}
                      >
                        <CardContent className="p-3">
                          <Link to={`/leads/${lead.id}`}>
                            <p className="font-medium text-sm truncate">{lead.lead_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.organization_name}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs font-mono text-muted-foreground">
                                {lead.proposed_price ? `$${lead.proposed_price.toLocaleString()}` : '-'}
                              </span>
                              <Badge variant="outline" className={`text-xs ${STATUS_COLORS[lead.status]}`}>
                                {lead.status}
                              </Badge>
                            </div>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-6">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Target className="h-12 w-12 mb-4 opacity-50" />
                  <p>No leads found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Lead</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Organization</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stage</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Value</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Owner</th>
                        <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="border-b border-border hover:bg-muted/50" data-testid={`lead-row-${lead.id}`}>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{lead.lead_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{lead.lead_code}</p>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{lead.organization_name}</td>
                          <td className="p-4">
                            <Badge variant="outline" className={STAGE_COLORS[lead.stage]}>
                              {lead.stage}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={STATUS_COLORS[lead.status]}>
                              {lead.status}
                            </Badge>
                          </td>
                          <td className="p-4 font-mono text-sm">
                            {lead.proposed_price ? `$${lead.proposed_price.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-4 text-muted-foreground">{lead.sales_owner}</td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Link to={`/leads/${lead.id}`}>
                                <Button variant="ghost" size="icon" data-testid={`view-lead-${lead.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(lead.id)}
                                data-testid={`delete-lead-${lead.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leads;
