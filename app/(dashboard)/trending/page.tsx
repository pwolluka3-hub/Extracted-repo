'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  RefreshCw, 
  Filter, 
  Sparkles,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Flame,
  ArrowUp,
  ArrowDown,
  Minus,
  Hash,
  Globe,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBrandKit } from '@/lib/context/BrandKitContext';
import { 
  getTrendingTopics, 
  getPlatformTrends,
  getIndustryTrends,
  getTopicContentIdeas,
  saveTopic,
  getSavedTopics,
  removeSavedTopic,
  type TrendingTopic 
} from '@/lib/services/trendingService';
import type { Platform } from '@/lib/types';

export default function TrendingPage() {
  const { brandKit } = useBrandKit();
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [savedTopics, setSavedTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null);
  const [contentIdeas, setContentIdeas] = useState<string[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Platform>('all');

  useEffect(() => {
    loadTopics();
    loadSavedTopics();
  }, [brandKit?.niche]);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const niche = brandKit?.niche || 'marketing';
      const data = await getTrendingTopics(niche, { limit: 15 });
      setTopics(data);
    } catch (err) {
      console.error('Failed to load trending topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedTopics = async () => {
    try {
      const saved = await getSavedTopics();
      setSavedTopics(saved);
    } catch (err) {
      console.error('Failed to load saved topics:', err);
    }
  };

  const refreshTopics = async () => {
    setRefreshing(true);
    try {
      const niche = brandKit?.niche || 'marketing';
      const data = await getTrendingTopics(niche, { limit: 15, forceRefresh: true });
      setTopics(data);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveTopic = async (topic: TrendingTopic) => {
    const isSaved = savedTopics.some(t => t.topic === topic.topic);
    
    if (isSaved) {
      await removeSavedTopic(topic.id);
      setSavedTopics(prev => prev.filter(t => t.topic !== topic.topic));
    } else {
      await saveTopic(topic);
      setSavedTopics(prev => [...prev, topic]);
    }
  };

  const loadContentIdeas = async (topic: TrendingTopic) => {
    setSelectedTopic(topic);
    setLoadingIdeas(true);
    setContentIdeas([]);
    
    try {
      const ideas = await getTopicContentIdeas(topic, brandKit, 5);
      setContentIdeas(ideas);
    } catch (err) {
      console.error('Failed to load ideas:', err);
    } finally {
      setLoadingIdeas(false);
    }
  };

  const copyHashtag = (tag: string) => {
    navigator.clipboard.writeText(`#${tag}`);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const filteredTopics = filter === 'all'
    ? topics
    : topics.filter(t => t.platforms.includes(filter));

  const getVolumeIcon = (volume: TrendingTopic['volume']) => {
    switch (volume) {
      case 'viral':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'high':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'rising':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSentimentColor = (sentiment: TrendingTopic['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-500';
      case 'negative':
        return 'text-red-500';
      case 'mixed':
        return 'text-yellow-500';
      default:
        return 'text-muted-foreground';
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
                <TrendingUp className="w-6 h-6 text-primary" />
                Trending Topics
              </h1>
              <p className="text-muted-foreground mt-1">
                Discover what&apos;s trending in {brandKit?.niche || 'your niche'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | Platform)}
                className="bg-muted border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Platforms</option>
                <option value="twitter">Twitter</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
              </select>
              <Button
                variant="outline"
                onClick={refreshTopics}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Topics List */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs defaultValue="trending">
              <TabsList>
                <TabsTrigger value="trending" className="gap-2">
                  <Flame className="w-4 h-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="saved" className="gap-2">
                  <Bookmark className="w-4 h-4" />
                  Saved ({savedTopics.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trending" className="mt-4">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredTopics.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No trending topics found</h3>
                      <p className="text-muted-foreground">
                        Try refreshing or changing your filter
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filteredTopics.map((topic) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        isSaved={savedTopics.some(t => t.topic === topic.topic)}
                        isSelected={selectedTopic?.id === topic.id}
                        onSelect={() => loadContentIdeas(topic)}
                        onSave={() => handleSaveTopic(topic)}
                        getVolumeIcon={getVolumeIcon}
                        getSentimentColor={getSentimentColor}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="saved" className="mt-4">
                {savedTopics.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No saved topics</h3>
                      <p className="text-muted-foreground">
                        Save topics to reference them later
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {savedTopics.map((topic) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        isSaved={true}
                        isSelected={selectedTopic?.id === topic.id}
                        onSelect={() => loadContentIdeas(topic)}
                        onSave={() => handleSaveTopic(topic)}
                        getVolumeIcon={getVolumeIcon}
                        getSentimentColor={getSentimentColor}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Details Panel */}
          <div className="space-y-4">
            {selectedTopic ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Content Ideas
                    </CardTitle>
                    <CardDescription>
                      AI-generated ideas for &quot;{selectedTopic.topic}&quot;
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingIdeas ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                        ))}
                      </div>
                    ) : contentIdeas.length > 0 ? (
                      <div className="space-y-3">
                        {contentIdeas.map((idea, i) => (
                          <div
                            key={i}
                            className="p-3 bg-muted/50 rounded-lg text-sm border border-border hover:border-primary/50 cursor-pointer transition-colors"
                          >
                            {idea}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Click on a topic to get content ideas
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-primary" />
                      Related Hashtags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedTopic.hashtags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => copyHashtag(tag)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20 transition-colors"
                        >
                          #{tag}
                          {copiedTag === tag ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-50" />
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      Related Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedTopic.relatedTopics.map((related, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                        >
                          <span className="text-sm">{related}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Topic</h3>
                  <p className="text-muted-foreground">
                    Click on any trending topic to see content ideas and related hashtags
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopicCard({
  topic,
  isSaved,
  isSelected,
  onSelect,
  onSave,
  getVolumeIcon,
  getSentimentColor,
}: {
  topic: TrendingTopic;
  isSaved: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onSave: () => void;
  getVolumeIcon: (volume: TrendingTopic['volume']) => React.ReactNode;
  getSentimentColor: (sentiment: TrendingTopic['sentiment']) => string;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={onSelect}>
            <div className="flex items-center gap-2 mb-1">
              {getVolumeIcon(topic.volume)}
              <h3 className="font-medium">{topic.topic}</h3>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="capitalize">{topic.category}</span>
              <span className={getSentimentColor(topic.sentiment)}>
                {topic.sentiment}
              </span>
              <span className="text-primary">
                {topic.relevanceScore}% relevant
              </span>
            </div>
            <div className="flex gap-1 mt-2">
              {topic.platforms.slice(0, 3).map((platform) => (
                <span
                  key={platform}
                  className="text-xs px-2 py-0.5 bg-muted rounded capitalize"
                >
                  {platform}
                </span>
              ))}
              {topic.platforms.length > 3 && (
                <span className="text-xs px-2 py-0.5 bg-muted rounded">
                  +{topic.platforms.length - 3}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {isSaved ? (
              <BookmarkCheck className="w-5 h-5 text-primary" />
            ) : (
              <Bookmark className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
