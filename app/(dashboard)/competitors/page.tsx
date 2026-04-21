'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  BarChart3,
  RefreshCw,
  ExternalLink,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle,
  Search,
  Edit2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBrandKit } from '@/lib/context/BrandKitContext';
import {
  addCompetitor,
  getCompetitors,
  deleteCompetitor,
  analyzeCompetitor,
  compareCompetitors,
  getCompetitorInspiration,
  type Competitor,
  type CompetitorAnalysis,
  type CompetitorComparison,
} from '@/lib/services/competitorService';
import type { Platform } from '@/lib/types';

export default function CompetitorsPage() {
  const { brandKit } = useBrandKit();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [comparison, setComparison] = useState<CompetitorComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [inspiration, setInspiration] = useState<string[]>([]);
  const [loadingInspiration, setLoadingInspiration] = useState(false);

  // Form state
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    website: '',
    description: '',
    handles: {
      twitter: '',
      instagram: '',
      linkedin: '',
      tiktok: '',
    },
  });

  useEffect(() => {
    loadCompetitors();
  }, []);

  const loadCompetitors = async () => {
    setLoading(true);
    try {
      const data = await getCompetitors();
      setCompetitors(data);
    } catch (err) {
      console.error('Failed to load competitors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitor.name) return;
    
    try {
      const competitor = await addCompetitor({
        name: newCompetitor.name,
        website: newCompetitor.website,
        description: newCompetitor.description,
        handles: newCompetitor.handles as Record<Platform, string>,
      });
      
      setCompetitors(prev => [...prev, competitor]);
      setShowAddForm(false);
      setNewCompetitor({
        name: '',
        website: '',
        description: '',
        handles: { twitter: '', instagram: '', linkedin: '', tiktok: '' },
      });
    } catch (err) {
      console.error('Failed to add competitor:', err);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      await deleteCompetitor(id);
      setCompetitors(prev => prev.filter(c => c.id !== id));
      if (selectedCompetitor?.id === id) {
        setSelectedCompetitor(null);
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Failed to delete competitor:', err);
    }
  };

  const handleAnalyze = async (competitor: Competitor, platform: Platform) => {
    setSelectedCompetitor(competitor);
    setAnalyzing(true);
    setAnalysis(null);
    
    try {
      const result = await analyzeCompetitor(competitor, platform, brandKit);
      setAnalysis(result);
    } catch (err) {
      console.error('Failed to analyze competitor:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCompare = async () => {
    if (competitors.length < 2) return;
    
    setComparing(true);
    setComparison(null);
    
    try {
      const ids = competitors.map(c => c.id);
      const result = await compareCompetitors(ids, 'instagram', brandKit);
      setComparison(result);
    } catch (err) {
      console.error('Failed to compare competitors:', err);
    } finally {
      setComparing(false);
    }
  };

  const handleGetInspiration = async (competitor: Competitor) => {
    setLoadingInspiration(true);
    setInspiration([]);
    
    try {
      const ideas = await getCompetitorInspiration(competitor.id, 'instagram', 'general', brandKit);
      setInspiration(ideas);
    } catch (err) {
      console.error('Failed to get inspiration:', err);
    } finally {
      setLoadingInspiration(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Competitor Analysis
              </h1>
              <p className="text-muted-foreground mt-1">
                Track and analyze your competitors
              </p>
            </div>
            <div className="flex items-center gap-3">
              {competitors.length >= 2 && (
                <Button
                  variant="outline"
                  onClick={handleCompare}
                  disabled={comparing}
                  className="gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Compare All
                </Button>
              )}
              <Button onClick={() => setShowAddForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Competitor
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Competitor Form */}
        {showAddForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Competitor</CardTitle>
              <CardDescription>Enter details about your competitor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Name *</label>
                  <Input
                    value={newCompetitor.name}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Competitor name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Website</label>
                  <Input
                    value={newCompetitor.website}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={newCompetitor.description}
                  onChange={(e) => setNewCompetitor(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the competitor"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Social Media Handles</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Twitter</span>
                    <Input
                      value={newCompetitor.handles.twitter}
                      onChange={(e) => setNewCompetitor(prev => ({
                        ...prev,
                        handles: { ...prev.handles, twitter: e.target.value }
                      }))}
                      placeholder="@handle"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Instagram</span>
                    <Input
                      value={newCompetitor.handles.instagram}
                      onChange={(e) => setNewCompetitor(prev => ({
                        ...prev,
                        handles: { ...prev.handles, instagram: e.target.value }
                      }))}
                      placeholder="@handle"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">LinkedIn</span>
                    <Input
                      value={newCompetitor.handles.linkedin}
                      onChange={(e) => setNewCompetitor(prev => ({
                        ...prev,
                        handles: { ...prev.handles, linkedin: e.target.value }
                      }))}
                      placeholder="company-name"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">TikTok</span>
                    <Input
                      value={newCompetitor.handles.tiktok}
                      onChange={(e) => setNewCompetitor(prev => ({
                        ...prev,
                        handles: { ...prev.handles, tiktok: e.target.value }
                      }))}
                      placeholder="@handle"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCompetitor} disabled={!newCompetitor.name}>
                  Add Competitor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Competitors List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Your Competitors</h2>
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : competitors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No competitors yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add competitors to track their strategies
                  </p>
                  <Button onClick={() => setShowAddForm(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add First Competitor
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {competitors.map((competitor) => (
                  <Card
                    key={competitor.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCompetitor?.id === competitor.id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1"
                          onClick={() => setSelectedCompetitor(competitor)}
                        >
                          <h3 className="font-medium">{competitor.name}</h3>
                          {competitor.website && (
                            <a
                              href={competitor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {competitor.website.replace(/^https?:\/\//, '')}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {competitor.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {competitor.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            {Object.entries(competitor.handles)
                              .filter(([_, v]) => v)
                              .slice(0, 3)
                              .map(([platform]) => (
                                <span
                                  key={platform}
                                  className="text-xs px-2 py-0.5 bg-muted rounded capitalize"
                                >
                                  {platform}
                                </span>
                              ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCompetitor(competitor.id)}
                          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAnalyze(competitor, 'instagram')}
                          className="flex-1 gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Analyze
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGetInspiration(competitor)}
                          className="flex-1 gap-1"
                        >
                          <Lightbulb className="w-3 h-3" />
                          Ideas
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Analysis Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Comparison Results */}
            {comparison && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Competitor Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {comparison.metrics.map((metric, i) => (
                      <div key={i} className="p-3 bg-muted/30 rounded-lg">
                        <div className="font-medium mb-2">{metric.metric}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(metric.values).map(([name, value]) => (
                            <div
                              key={name}
                              className={`flex justify-between p-2 rounded ${
                                name === metric.winner ? 'bg-green-500/10 text-green-600' : 'bg-muted/50'
                              }`}
                            >
                              <span>{name}</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="font-medium mb-2">Key Insights</h4>
                      <ul className="space-y-2">
                        {comparison.insights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-2">
                        {comparison.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Target className="w-4 h-4 text-primary mt-0.5" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Results */}
            {analyzing ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Analyzing competitor...</p>
                </CardContent>
              </Card>
            ) : analysis ? (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis: {selectedCompetitor?.name}</CardTitle>
                  <CardDescription>
                    Platform: {analysis.platform} | Analyzed: {new Date(analysis.analyzedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="metrics">
                    <TabsList>
                      <TabsTrigger value="metrics">Metrics</TabsTrigger>
                      <TabsTrigger value="swot">SWOT</TabsTrigger>
                      <TabsTrigger value="strategy">Strategy</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="metrics" className="mt-4 space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <div className="text-sm text-muted-foreground">Est. Followers</div>
                          <div className="text-xl font-bold">{analysis.metrics.estimatedFollowers}</div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <div className="text-sm text-muted-foreground">Posting Frequency</div>
                          <div className="text-xl font-bold">{analysis.metrics.postingFrequency}</div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <div className="text-sm text-muted-foreground">Avg Engagement</div>
                          <div className="text-xl font-bold">{analysis.metrics.avgEngagement}</div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <div className="text-sm text-muted-foreground">Content Types</div>
                          <div className="text-sm font-medium">
                            {analysis.metrics.contentTypes.join(', ')}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Top Performing Content</h4>
                        <ul className="space-y-2">
                          {analysis.metrics.topPerformingContent.map((content, i) => (
                            <li key={i} className="p-2 bg-muted/30 rounded text-sm">
                              {content}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Hashtags Used</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.metrics.hashtags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="swot" className="mt-4 space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                          <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Strengths
                          </h4>
                          <ul className="space-y-1">
                            {analysis.strengths.map((s, i) => (
                              <li key={i} className="text-sm">{s}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                          <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Weaknesses
                          </h4>
                          <ul className="space-y-1">
                            {analysis.weaknesses.map((w, i) => (
                              <li key={i} className="text-sm">{w}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="sm:col-span-2 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Opportunities for You
                          </h4>
                          <ul className="space-y-1">
                            {analysis.opportunities.map((o, i) => (
                              <li key={i} className="text-sm">{o}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="strategy" className="mt-4">
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="font-medium mb-2">Content Strategy Summary</h4>
                        <p className="text-muted-foreground">{analysis.contentStrategy}</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : selectedCompetitor ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
                  <p className="text-muted-foreground mb-4">
                    Click &quot;Analyze&quot; to get detailed insights about {selectedCompetitor.name}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Competitor</h3>
                  <p className="text-muted-foreground">
                    Choose a competitor from the list to analyze their strategy
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Inspiration Ideas */}
            {loadingInspiration ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-primary mb-2" />
                  <p className="text-muted-foreground">Getting content ideas...</p>
                </CardContent>
              </Card>
            ) : inspiration.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Content Inspiration
                  </CardTitle>
                  <CardDescription>
                    Ideas inspired by {selectedCompetitor?.name}&apos;s strategy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inspiration.map((idea, i) => (
                      <div
                        key={i}
                        className="p-3 bg-muted/50 rounded-lg text-sm border border-border hover:border-primary/50 cursor-pointer transition-colors"
                      >
                        {idea}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
