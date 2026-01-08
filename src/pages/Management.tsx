import { Plus, Users, Store, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockStores } from '@/lib/mock-data';

export default function Management() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Users & Store Management</h1><p className="text-muted-foreground">Manage users, roles, and store access</p></div>
      </div>

      <Tabs defaultValue="stores" className="space-y-4">
        <TabsList><TabsTrigger value="stores" className="gap-2"><Store className="h-4 w-4" /> Stores</TabsTrigger><TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger></TabsList>

        <TabsContent value="stores">
          <div className="flex justify-end mb-4"><Button className="gap-2"><Plus className="h-4 w-4" /> Add Store</Button></div>
          <div className="dashboard-widget">
            <table className="w-full">
              <thead className="bg-muted/50"><tr><th className="text-left p-4 font-medium">Code</th><th className="text-left p-4 font-medium">Name</th><th className="text-left p-4 font-medium">Region</th><th className="text-left p-4 font-medium">Type</th><th className="text-left p-4 font-medium">Status</th></tr></thead>
              <tbody className="divide-y">
                {mockStores.map(store => (
                  <tr key={store.id} className="hover:bg-muted/30">
                    <td className="p-4 font-mono text-sm">{store.store_code}</td>
                    <td className="p-4 font-medium">{store.store_name}</td>
                    <td className="p-4 text-muted-foreground">{store.region}</td>
                    <td className="p-4"><Badge variant="outline">{store.store_type}</Badge></td>
                    <td className="p-4"><Badge className={store.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>{store.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="flex justify-end mb-4"><Button className="gap-2"><Plus className="h-4 w-4" /> Add User</Button></div>
          <div className="dashboard-widget p-6 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>User management will display registered HQ users here.</p>
            <p className="text-sm">Create an account to see users.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
