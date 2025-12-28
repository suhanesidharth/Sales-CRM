import { useState, useEffect } from 'react';
import { getTeamMembers, inviteTeamMember, updateTeamMember, removeTeamMember } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { UserPlus, Users, Shield, User, Trash2, Mail, Crown } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'user', label: 'User', color: 'bg-slate-500/20 text-slate-400' },
  { value: 'viewer', label: 'Viewer', color: 'bg-green-500/20 text-green-400' },
];

const TeamManagement = () => {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'user'
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await getTeamMembers();
      setMembers(response.data);
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await inviteTeamMember(formData);
      toast.success('Team member added');
      setDialogOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add member');
    }
  };

  const handleToggleActive = async (memberId, isActive) => {
    try {
      await updateTeamMember(memberId, { is_active: !isActive });
      toast.success(isActive ? 'Member deactivated' : 'Member activated');
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update member');
    }
  };

  const handleRoleChange = async (memberId, role) => {
    try {
      await updateTeamMember(memberId, { role });
      toast.success('Role updated');
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleRemove = async (memberId) => {
    if (!window.confirm('Remove this team member?')) return;
    try {
      await removeTeamMember(memberId);
      toast.success('Member removed');
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove member');
    }
  };

  const getRoleColor = (role) => ROLES.find(r => r.value === role)?.color || 'bg-slate-500/20 text-slate-400';

  return (
    <div data-testid="team-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage team access and permissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary" data-testid="invite-member-button">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  data-testid="member-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                  data-testid="member-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Initial password"
                  data-testid="member-password-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger data-testid="member-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="glow-primary" data-testid="member-submit-button">
                  Add Member
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Info */}
      <Card className="bg-muted/50 border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Role Permissions</p>
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <p><strong>Admin:</strong> Full access, can manage team members</p>
                <p><strong>Manager:</strong> Can create/edit all data, cannot manage team</p>
                <p><strong>User:</strong> Can create/edit leads and organizations</p>
                <p><strong>Viewer:</strong> Read-only access to all data</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    member.is_active ? 'border-border' : 'border-destructive/30 bg-destructive/5'
                  }`}
                  data-testid={`member-${member.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      member.role === 'admin' ? 'bg-amber-500/20' : 'bg-primary/20'
                    }`}>
                      {member.role === 'admin' ? (
                        <Crown className="h-5 w-5 text-amber-400" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {member.name}
                        {member.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {member.id !== currentUser?.id ? (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member.id, v)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                <Badge variant="outline" className={role.color}>{role.label}</Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Active</span>
                          <Switch
                            checked={member.is_active}
                            onCheckedChange={() => handleToggleActive(member.id, member.is_active)}
                          />
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleRemove(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className={getRoleColor(member.role)}>
                        {member.role.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagement;
