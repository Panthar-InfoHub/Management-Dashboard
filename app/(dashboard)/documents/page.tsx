"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileText, Search, Plus, FolderOpen, Book, Code, FileCode, Users, Shield, Lightbulb, Clock, ArrowRight } from "lucide-react";

const categories = [
  { name: "SOPs", icon: Book, count: 12, color: "text-blue-500 bg-blue-500/10" },
  { name: "Engineering", icon: Code, count: 24, color: "text-purple-500 bg-purple-500/10" },
  { name: "Product Specs", icon: FileCode, count: 8, color: "text-green-500 bg-green-500/10" },
  { name: "Meeting Notes", icon: Users, count: 18, color: "text-amber-500 bg-amber-500/10" },
  { name: "Architecture", icon: Lightbulb, count: 6, color: "text-cyan-500 bg-cyan-500/10" },
  { name: "HR Policies", icon: Shield, count: 10, color: "text-pink-500 bg-pink-500/10" },
];

const recentDocs = [
  { title: "API Gateway Architecture", category: "Architecture", author: "Arjun Mehta", updated: "2 hours ago", views: 45 },
  { title: "Sprint Planning Guide", category: "SOPs", author: "Rahul Verma", updated: "5 hours ago", views: 32 },
  { title: "Mobile App PRD v3", category: "Product Specs", author: "Priya Sharma", updated: "1 day ago", views: 67 },
  { title: "Onboarding Checklist", category: "HR Policies", author: "Divya Krishnan", updated: "2 days ago", views: 128 },
  { title: "Database Migration Plan", category: "Engineering", author: "Ananya Gupta", updated: "3 days ago", views: 23 },
  { title: "Design System Guidelines", category: "Engineering", author: "Sneha Patel", updated: "4 days ago", views: 89 },
  { title: "Q3 Roadmap Review", category: "Meeting Notes", author: "Rahul Verma", updated: "5 days ago", views: 54 },
  { title: "Security Best Practices", category: "SOPs", author: "Vikram Singh", updated: "1 week ago", views: 201 },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">Internal knowledge base and documentation hub.</p>
        </div>
        <Button size="sm" className="gap-2 text-xs"><Plus className="h-3.5 w-3.5" /> New Document</Button>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search documents…" className="pl-9 h-9 text-sm" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {categories.map(cat => (
          <Card key={cat.name} className="border-border/50 hover:border-border transition-all hover:shadow-sm cursor-pointer group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cat.color)}>
                <cat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium">{cat.name}</p>
                <p className="text-[10px] text-muted-foreground">{cat.count} docs</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Recently Updated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {recentDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-4 py-3 hover:bg-accent/30 -mx-2 px-2 rounded-md transition-colors cursor-pointer group">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-blue-500 transition-colors">{doc.title}</p>
                  <p className="text-[10px] text-muted-foreground">{doc.author} · {doc.updated}</p>
                </div>
                <Badge variant="secondary" className="text-[9px] shrink-0">{doc.category}</Badge>
                <span className="text-[10px] text-muted-foreground shrink-0">{doc.views} views</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
