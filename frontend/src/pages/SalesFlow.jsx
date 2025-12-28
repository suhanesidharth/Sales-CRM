import { useState, useEffect } from 'react';
import { getSalesFlow, createSalesFlow, updateSalesFlow, deleteSalesFlow } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, GitBranch, Trash2, Edit2, ArrowRight, User, FileText } from 'lucide-react';

const PLAYER_TYPES = ['HOSPITAL', 'NGO', 'GOVT', 'CORPORATE'];

const TYPE_COLORS = {
  HOSPITAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NGO: 'bg-green-500/20 text-green-400 border-green-500/30',
  GOVT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CORPORATE: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
};

const SalesFlow = () => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('HOSPITAL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [formData, setFormData] = useState({
    player_type: 'HOSPITAL',
    step_number: 1,
    description: '',
    owner: '',
    output: ''
  });

  useEffect(() => {
    fetchFlows();
  }, [selectedType]);

  const fetchFlows = async () => {
    try {
      const response = await getSalesFlow({ player_type: selectedType });
      setFlows(response.data);
    } catch (error) {
      toast.error('Failed to load sales flows');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.owner || !formData.output) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      if (editingFlow) {
        await updateSalesFlow(editingFlow.id, formData);
        toast.success('Step updated');
      } else {
        await createSalesFlow({ ...formData, player_type: selectedType });
        toast.success('Step created');
      }
      setDialogOpen(false);
      setEditingFlow(null);
      setFormData({
        player_type: selectedType,
        step_number: flows.length + 1,
        description: '',
        owner: '',
        output: ''
      });
      fetchFlows();
    } catch (error) {
      toast.error('Failed to save step');
    }
  };

  const handleEdit = (flow) => {
    setEditingFlow(flow);
    setFormData({
      player_type: flow.player_type,
      step_number: flow.step_number,
      description: flow.description,
      owner: flow.owner,
      output: flow.output
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this step?')) return;
    try {
      await deleteSalesFlow(id);
      toast.success('Step deleted');
      fetchFlows();
    } catch (error) {
      toast.error('Failed to delete step');
    }
  };

  const openCreateDialog = () => {
    setEditingFlow(null);
    setFormData({
      player_type: selectedType,
      step_number: flows.length + 1,
      description: '',
      owner: '',
      output: ''
    });
    setDialogOpen(true);
  };

  return (
    <div data-testid="sales-flow-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Flow</h1>
          <p className="text-muted-foreground">Configure your sales process by organization type</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary" onClick={openCreateDialog} data-testid="add-step-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingFlow ? 'Edit Step' : 'Add Step'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Player Type</Label>
                  <Select 
                    value={formData.player_type} 
                    onValueChange={(v) => setFormData({ ...formData, player_type: v })}
                    disabled={!!editingFlow}
                  >
                    <SelectTrigger data-testid="step-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYER_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Step Number</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.step_number}
                    onChange={(e) => setFormData({ ...formData, step_number: parseInt(e.target.value) || 1 })}
                    data-testid="step-number-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What happens in this step?"
                  rows={3}
                  data-testid="step-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Who is responsible?"
                  data-testid="step-owner-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Output</Label>
                <Input
                  value={formData.output}
                  onChange={(e) => setFormData({ ...formData, output: e.target.value })}
                  placeholder="Expected output of this step"
                  data-testid="step-output-input"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="glow-primary" data-testid="step-submit-button">
                  {editingFlow ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Type Tabs */}
      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="bg-muted">
          {PLAYER_TYPES.map(type => (
            <TabsTrigger 
              key={type} 
              value={type}
              data-testid={`tab-${type.toLowerCase()}`}
              className="gap-2"
            >
              <Badge variant="outline" className={`${TYPE_COLORS[type]} border-0 text-xs`}>
                {type}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {PLAYER_TYPES.map(type => (
          <TabsContent key={type} value={type} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : flows.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <GitBranch className="h-12 w-12 mb-4 opacity-50" />
                  <p className="mb-4">No sales flow defined for {type}</p>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Step
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                {/* Flow Steps */}
                <div className="space-y-4">
                  {flows.map((flow, index) => (
                    <div key={flow.id} className="relative" data-testid={`flow-step-${flow.id}`}>
                      {/* Connector Line */}
                      {index < flows.length - 1 && (
                        <div className="absolute left-6 top-full w-0.5 h-4 bg-border z-0" />
                      )}
                      
                      <Card className="bg-card border-border hover:border-primary/50 transition-colors relative z-10">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Step Number */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary/20 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary font-mono">
                                {flow.step_number}
                              </span>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground mb-2">{flow.description}</p>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <User className="h-4 w-4" />
                                  <span>{flow.owner}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <FileText className="h-4 w-4" />
                                  <span>{flow.output}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(flow)}
                                data-testid={`edit-step-${flow.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive"
                                onClick={() => handleDelete(flow.id)}
                                data-testid={`delete-step-${flow.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Arrow between steps */}
                      {index < flows.length - 1 && (
                        <div className="flex justify-center py-2">
                          <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Info Card */}
      <Card className="bg-muted/50 border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <GitBranch className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">About Sales Flows</p>
              <p className="text-sm text-muted-foreground mt-1">
                Define the step-by-step sales process for different organization types. Each step includes 
                who is responsible (Owner) and what deliverable is expected (Output). This helps your 
                team follow a consistent sales methodology.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesFlow;
