import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLead, updateLead, getMilestones, createMilestone, deleteMilestone, getDocuments, createDocument, deleteDocument, updateMilestone, updateDocument, getLeadNotes, createLeadNote, deleteLeadNote } from '../lib/api';
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
import { ArrowLeft, Save, Flag, FileText, Plus, Trash2, CheckCircle, Clock, Calendar, MessageSquare, Send, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const STAGES = ['IDENTIFIED', 'QUALIFIED', 'DEMO', 'PILOT', 'COMMERCIAL', 'CLOSED'];
const STATUSES = ['OPEN', 'WON', 'LOST'];
const MILESTONE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
const DOC_STATUSES = ['DRAFT', 'SHARED', 'SIGNED'];
const DOC_TYPES = ['PROPOSAL', 'CONTRACT', 'NDA', 'INVOICE', 'OTHER'];
const UPDATE_TYPES = ['GENERAL', 'DAILY', 'WEEKLY', 'CALL', 'MEETING', 'EMAIL'];

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

const MILESTONE_STATUS_COLORS = {
  PENDING: 'bg-slate-500/20 text-slate-400',
  IN_PROGRESS: 'bg-amber-500/20 text-amber-400',
  COMPLETED: 'bg-green-500/20 text-green-400'
};

const UPDATE_TYPE_COLORS = {
  GENERAL: 'bg-slate-500/20 text-slate-400',
  DAILY: 'bg-blue-500/20 text-blue-400',
  WEEKLY: 'bg-purple-500/20 text-purple-400',
  CALL: 'bg-green-500/20 text-green-400',
  MEETING: 'bg-amber-500/20 text-amber-400',
  EMAIL: 'bg-cyan-500/20 text-cyan-400'
};

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [milestoneForm, setMilestoneForm] = useState({
    name: '', start_date: '', end_date: '', status: 'PENDING'
  });
  const [docForm, setDocForm] = useState({
    type: '', status: 'DRAFT', shared_at: '', signed_at: ''
  });
  const [newNote, setNewNote] = useState({ content: '', update_type: 'GENERAL' });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [leadRes, milestonesRes, docsRes, notesRes] = await Promise.all([
        getLead(id),
        getMilestones({ lead_id: id }),
        getDocuments({ lead_id: id }),
        getLeadNotes({ lead_id: id })
      ]);
      setLead(leadRes.data);
      setMilestones(milestonesRes.data);
      setDocuments(docsRes.data);
      setNotes(notesRes.data);
      setFormData({
        lead_name: leadRes.data.lead_name,
        product: leadRes.data.product,
        offered_price: leadRes.data.offered_price || '',
        agreed_price: leadRes.data.agreed_price || '',
        expected_volume: leadRes.data.expected_volume || '',
        stage: leadRes.data.stage,
        probability: leadRes.data.probability,
        status: leadRes.data.status,
        expected_close_date: leadRes.data.expected_close_date || '',
        sales_owner: leadRes.data.sales_owner,
        source: leadRes.data.source || '',
        remarks: leadRes.data.remarks || ''
      });
    } catch (error) {
      toast.error('Failed to load lead');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...formData,
        offered_price: formData.offered_price ? parseFloat(formData.offered_price) : null,
        agreed_price: formData.agreed_price ? parseFloat(formData.agreed_price) : null,
        expected_volume: formData.expected_volume ? parseInt(formData.expected_volume) : null
      };
      await updateLead(id, data);
      toast.success('Lead updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.name || !milestoneForm.start_date || !milestoneForm.end_date) {
      toast.error('Fill all required fields');
      return;
    }
    try {
      await createMilestone({ ...milestoneForm, lead_id: id });
      toast.success('Milestone created');
      setMilestoneDialogOpen(false);
      setMilestoneForm({ name: '', start_date: '', end_date: '', status: 'PENDING' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      await deleteMilestone(milestoneId);
      toast.success('Milestone deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete milestone');
    }
  };

  const handleUpdateMilestoneStatus = async (milestoneId, status) => {
    try {
      await updateMilestone(milestoneId, { status });
      toast.success('Milestone updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update milestone');
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!docForm.type) {
      toast.error('Select document type');
      return;
    }
    try {
      await createDocument({ ...docForm, lead_id: id });
      toast.success('Document created');
      setDocDialogOpen(false);
      setDocForm({ type: '', status: 'DRAFT', shared_at: '', signed_at: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create document');
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await deleteDocument(docId);
      toast.success('Document deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleUpdateDocStatus = async (docId, status) => {
    try {
      const updateData = { status };
      if (status === 'SHARED') updateData.shared_at = new Date().toISOString();
      if (status === 'SIGNED') updateData.signed_at = new Date().toISOString();
      await updateDocument(docId, updateData);
      toast.success('Document updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update document');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      toast.error('Please enter a note');
      return;
    }
    try {
      await createLeadNote({ lead_id: id, content: newNote.content, update_type: newNote.update_type });
      toast.success('Update added');
      setNewNote({ content: '', update_type: 'GENERAL' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add update');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteLeadNote(noteId);
      toast.success('Update deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete update');
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
    <div data-testid="lead-detail-page" className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{lead?.lead_name}</h1>
            <Badge variant="outline" className={STAGE_COLORS[lead?.stage]}>
              {lead?.stage}
            </Badge>
            <Badge variant="outline" className={STATUS_COLORS[lead?.status]}>
              {lead?.status}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-sm">{lead?.lead_code}</p>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Details Form */}
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Lead Name</Label>
              <Input value={formData.lead_name || ''} onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })} data-testid="edit-lead-name" />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Input value={formData.product || ''} onChange={(e) => setFormData({ ...formData, product: e.target.value })} data-testid="edit-lead-product" />
            </div>
            
            {/* Pricing Section */}
            <div className="p-3 rounded-md bg-muted/50 border border-border space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-primary" />
                Pricing
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Offered Price</Label>
                  <Input type="number" value={formData.offered_price || ''} onChange={(e) => setFormData({ ...formData, offered_price: e.target.value })} placeholder="Our price" data-testid="edit-lead-offered-price" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Agreed Price</Label>
                  <Input type="number" value={formData.agreed_price || ''} onChange={(e) => setFormData({ ...formData, agreed_price: e.target.value })} placeholder="Final price" data-testid="edit-lead-agreed-price" />
                </div>
              </div>
              {formData.offered_price && formData.agreed_price && (
                <div className="text-xs text-muted-foreground">
                  Discount: {((1 - formData.agreed_price / formData.offered_price) * 100).toFixed(1)}%
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Volume</Label>
              <Input type="number" value={formData.expected_volume || ''} onChange={(e) => setFormData({ ...formData, expected_volume: e.target.value })} data-testid="edit-lead-volume" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                  <SelectTrigger data-testid="edit-lead-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger data-testid="edit-lead-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Probability %</Label>
                <Input type="number" min="0" max="100" value={formData.probability || 0} onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })} data-testid="edit-lead-probability" />
              </div>
              <div className="space-y-2">
                <Label>Close Date</Label>
                <Input type="date" value={formData.expected_close_date || ''} onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })} data-testid="edit-lead-close-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sales Owner</Label>
              <Input value={formData.sales_owner || ''} onChange={(e) => setFormData({ ...formData, sales_owner: e.target.value })} data-testid="edit-lead-owner" />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={formData.source || ''} onChange={(e) => setFormData({ ...formData, source: e.target.value })} data-testid="edit-lead-source" />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={formData.remarks || ''} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} rows={2} data-testid="edit-lead-remarks" />
            </div>
            <Button onClick={handleSave} className="w-full glow-primary" disabled={saving} data-testid="save-lead-button">
              <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="updates">
            <TabsList className="bg-muted">
              <TabsTrigger value="updates" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Updates ({notes.length})
              </TabsTrigger>
              <TabsTrigger value="milestones" className="gap-2">
                <Flag className="h-4 w-4" />
                Milestones ({milestones.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                Documents ({documents.length})
              </TabsTrigger>
            </TabsList>

            {/* Updates Tab */}
            <TabsContent value="updates" className="mt-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Daily / Weekly Updates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Update Form */}
                  <div className="flex gap-2">
                    <Select value={newNote.update_type} onValueChange={(v) => setNewNote({ ...newNote, update_type: v })}>
                      <SelectTrigger className="w-[120px]" data-testid="note-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UPDATE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} placeholder="Add an update or note..." className="flex-1" data-testid="note-content-input" onKeyPress={(e) => e.key === 'Enter' && handleAddNote()} />
                    <Button onClick={handleAddNote} data-testid="add-note-button">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Notes List */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {notes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No updates yet</p>
                      </div>
                    ) : notes.map((note) => (
                      <div key={note.id} className="p-3 rounded-md border border-border hover:border-primary/50 transition-colors" data-testid={`note-${note.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={UPDATE_TYPE_COLORS[note.update_type]}>{note.update_type}</Badge>
                              <span className="text-xs text-muted-foreground">{note.created_by}</span>
                              <span className="text-xs text-muted-foreground">• {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                            <p className="text-sm">{note.content}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteNote(note.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Milestones</CardTitle>
                  <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="add-milestone-button"><Plus className="h-4 w-4 mr-2" />Add Milestone</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
                      <form onSubmit={handleCreateMilestone} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input value={milestoneForm.name} onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })} placeholder="Milestone name" data-testid="milestone-name-input" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={milestoneForm.start_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, start_date: e.target.value })} data-testid="milestone-start-input" />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input type="date" value={milestoneForm.end_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, end_date: e.target.value })} data-testid="milestone-end-input" />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                          <Button type="submit" className="glow-primary" data-testid="milestone-submit-button">Add</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {milestones.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground"><Flag className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No milestones yet</p></div>
                  ) : (
                    <div className="space-y-3">
                      {milestones.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-md border border-border hover:border-primary/50 transition-colors" data-testid={`milestone-${m.id}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md ${MILESTONE_STATUS_COLORS[m.status]}`}>
                              {m.status === 'COMPLETED' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium">{m.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{m.start_date} → {m.end_date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={m.status} onValueChange={(v) => handleUpdateMilestoneStatus(m.id, v)}>
                              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{MILESTONE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteMilestone(m.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="add-doc-button"><Plus className="h-4 w-4 mr-2" />Add Document</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
                      <form onSubmit={handleCreateDocument} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={docForm.type} onValueChange={(v) => setDocForm({ ...docForm, type: v })}>
                            <SelectTrigger data-testid="doc-type-select"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                          <Button type="submit" className="glow-primary" data-testid="doc-submit-button">Add</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No documents yet</p></div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-md border border-border hover:border-primary/50 transition-colors" data-testid={`document-${d.id}`}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-primary/20 text-primary"><FileText className="h-4 w-4" /></div>
                            <div>
                              <p className="font-medium">{d.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {d.shared_at && `Shared: ${format(new Date(d.shared_at), 'MMM d, yyyy')}`}
                                {d.signed_at && ` • Signed: ${format(new Date(d.signed_at), 'MMM d, yyyy')}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={d.status} onValueChange={(v) => handleUpdateDocStatus(d.id, v)}>
                              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{DOC_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDocument(d.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Organization Info */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{lead?.organization_name}</p>
                  <p className="text-sm text-muted-foreground">{lead?.organization_type}</p>
                </div>
                <Badge variant="outline">{lead?.organization_type}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
