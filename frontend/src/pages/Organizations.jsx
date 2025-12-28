import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrganizations, createOrganization, deleteOrganization, getOrgTypes, createOrgType, deleteOrgType } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Plus, Building2, Search, Trash2, Eye, Filter, Settings, X } from 'lucide-react';

const TYPE_COLORS = {
  HOSPITAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NGO: 'bg-green-500/20 text-green-400 border-green-500/30',
  GOVT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CORPORATE: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
};

const COLOR_OPTIONS = [
  { value: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Blue' },
  { value: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Green' },
  { value: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Amber' },
  { value: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Purple' },
  { value: 'bg-teal-500/20 text-teal-400 border-teal-500/30', label: 'Teal' },
  { value: 'bg-pink-500/20 text-pink-400 border-pink-500/30', label: 'Pink' },
  { value: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Red' },
  { value: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'Cyan' },
];

const Organizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [orgTypes, setOrgTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    state: '',
    city: ''
  });
  const [newTypeData, setNewTypeData] = useState({
    name: '',
    color: COLOR_OPTIONS[0].value
  });

  useEffect(() => {
    fetchData();
  }, [filterType]);

  const fetchData = async () => {
    try {
      const params = {};
      if (filterType && filterType !== 'all') params.type = filterType;
      const [orgsRes, typesRes] = await Promise.all([
        getOrganizations(params),
        getOrgTypes()
      ]);
      setOrganizations(orgsRes.data);
      setOrgTypes(typesRes.data);
    } catch (error) {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.type || !formData.state || !formData.city) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await createOrganization(formData);
      toast.success('Organization created');
      setDialogOpen(false);
      setFormData({ name: '', type: '', state: '', city: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create organization');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this organization?')) return;
    try {
      await deleteOrganization(id);
      toast.success('Organization deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete organization');
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    if (!newTypeData.name) {
      toast.error('Please enter a type name');
      return;
    }
    try {
      await createOrgType(newTypeData);
      toast.success('Organization type created');
      setNewTypeData({ name: '', color: COLOR_OPTIONS[0].value });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create type');
    }
  };

  const handleDeleteType = async (id) => {
    try {
      await deleteOrgType(id);
      toast.success('Organization type deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete type');
    }
  };

  const getTypeColor = (typeName) => {
    const type = orgTypes.find(t => t.name === typeName);
    return type?.color || TYPE_COLORS[typeName] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid="organizations-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">Manage your client organizations</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="manage-types-button">
                <Settings className="h-4 w-4 mr-2" />
                Manage Types
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Organization Types</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Add new type form */}
                <form onSubmit={handleCreateType} className="flex gap-2">
                  <Input
                    value={newTypeData.name}
                    onChange={(e) => setNewTypeData({ ...newTypeData, name: e.target.value })}
                    placeholder="New type name"
                    className="flex-1"
                    data-testid="new-type-name-input"
                  />
                  <Select value={newTypeData.color} onValueChange={(v) => setNewTypeData({ ...newTypeData, color: v })}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <Badge variant="outline" className={c.value}>{c.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" size="sm" data-testid="add-type-button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
                
                {/* Existing types */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {orgTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between p-2 rounded-md border border-border">
                      <Badge variant="outline" className={type.color}>
                        {type.name}
                      </Badge>
                      {!type.is_default && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteType(type.id)}
                          data-testid={`delete-type-${type.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      {type.is_default && (
                        <span className="text-xs text-muted-foreground">Default</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glow-primary" data-testid="create-org-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Organization name"
                    data-testid="org-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger data-testid="org-type-select">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgTypes.map(type => (
                        <SelectItem key={type.id} value={type.name}>
                          <Badge variant="outline" className={type.color}>{type.name}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                      data-testid="org-state-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                      data-testid="org-city-input"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" className="glow-primary" data-testid="org-submit-button">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="org-search-input"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]" data-testid="org-filter-type">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {orgTypes.map(type => (
              <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4 opacity-50" />
              <p>No organizations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => (
                  <TableRow key={org.id} className="border-border" data-testid={`org-row-${org.id}`}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(org.type)}>
                        {org.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {org.city}, {org.state}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{org.lead_count}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/organizations/${org.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`view-org-${org.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(org.id)}
                          data-testid={`delete-org-${org.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Organizations;
