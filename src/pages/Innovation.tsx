import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Plus, Eye, GitBranchPlus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useInnovationRequests } from '@/hooks/useInnovationRequests';
import { STATUS_CONFIG, type InnoRequest } from '@/components/innovation/constants';
import { useInnoRole } from '@/hooks/useInnoRole';

export default function Innovation() {
  const navigate = useNavigate();
  const { isInnoAdmin } = useInnoRole();
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<InnoRequest | null>(null);

  const { requests, isLoading, distinctValues } = useInnovationRequests({
    search: '',
    status: statutFilter,
    entite: 'all',
    codeProjet: 'all',
    usage: 'all',
    theme: 'all',
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView="innovation" onViewChange={() => {}} />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <PageHeader title={isInnoAdmin ? 'Demandes Innovation' : 'Mes demandes Innovation'} />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/innovation/requests')}>
              <GitBranchPlus className="w-4 h-4 mr-2" />
              Cartographie
            </Button>
            <Button onClick={() => navigate('/requests')}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle demande
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <Select value={statutFilter} onValueChange={setStatutFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {distinctValues.statuses.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{requests.length} demande(s)</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Chargement...</div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Aucune demande trouvée.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom projet</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Entité</TableHead>
                      {isInnoAdmin && <TableHead>Demandeur</TableHead>}
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map(r => {
                      const statusInfo = STATUS_CONFIG[r.status] || { label: r.status, color: '#888' };
                      return (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRequest(r)}>
                          <TableCell className="font-medium">{r.nom_projet}</TableCell>
                          <TableCell>
                            <Badge variant="outline" style={{ borderColor: statusInfo.color, color: statusInfo.color }}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.priority}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{r.entite_concernee || '-'}</TableCell>
                          {isInnoAdmin && <TableCell>{r.requester_name}</TableCell>}
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(r.created_at), 'dd MMM yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/innovation/requests/${r.id}`); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedRequest && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-warning" />
                    {selectedRequest.nom_projet}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Statut</p>
                      <Badge variant="outline" style={{ borderColor: STATUS_CONFIG[selectedRequest.status]?.color }}>
                        {STATUS_CONFIG[selectedRequest.status]?.label || selectedRequest.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Code projet</p>
                      <p className="font-medium">{selectedRequest.code_projet || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Entité</p>
                      <p className="font-medium">{selectedRequest.entite_concernee || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Usage</p>
                      <p className="font-medium">{selectedRequest.usage_inno || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Thème</p>
                      <p className="font-medium">{selectedRequest.theme || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sponsor</p>
                      <p className="font-medium">{selectedRequest.sponsor || '-'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Descriptif</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedRequest.descriptif || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gain attendu</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedRequest.gain_attendu || '-'}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Demandeur</p>
                      <p>{selectedRequest.requester_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date de soumission</p>
                      <p>{format(new Date(selectedRequest.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
