'use client';

import { useState, useEffect } from 'react';
import { 
  Link2, 
  Plus, 
  Trash2, 
  GripVertical, 
  ExternalLink,
  Copy,
  Check,
  Settings,
  Palette,
  Image,
  Eye,
  Save,
  Globe,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Music2,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { kvGet, kvSet } from '@/lib/services/puterService';

interface BioLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  clicks?: number;
}

interface BioPageConfig {
  username: string;
  name: string;
  bio: string;
  avatar?: string;
  theme: 'light' | 'dark' | 'gradient' | 'custom';
  primaryColor: string;
  backgroundColor: string;
  links: BioLink[];
  socialLinks: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
    email?: string;
  };
}

const DEFAULT_CONFIG: BioPageConfig = {
  username: 'yourname',
  name: 'Your Name',
  bio: 'Creator, Designer, Dreamer',
  theme: 'dark',
  primaryColor: '#00D4FF',
  backgroundColor: '#0a0a0a',
  links: [],
  socialLinks: {},
};

export default function LinkInBioPage() {
  const [config, setConfig] = useState<BioPageConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const saved = await kvGet('linkinbio_config');
      if (saved) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await kvSet('linkinbio_config', JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    setConfig(prev => ({
      ...prev,
      links: [
        ...prev.links,
        { id: `link_${Date.now()}`, title: '', url: '' },
      ],
    }));
  };

  const updateLink = (id: string, updates: Partial<BioLink>) => {
    setConfig(prev => ({
      ...prev,
      links: prev.links.map(link =>
        link.id === id ? { ...link, ...updates } : link
      ),
    }));
  };

  const removeLink = (id: string) => {
    setConfig(prev => ({
      ...prev,
      links: prev.links.filter(link => link.id !== id),
    }));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://nexus.link/${config.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Link2 className="w-6 h-6 text-primary" />
                Link in Bio
              </h1>
              <p className="text-muted-foreground mt-1">
                Create your personalized link page
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button onClick={saveConfig} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Editor */}
          <div className="space-y-6">
            <Tabs defaultValue="content">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Username</label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">nexus.link/</span>
                        <Input
                          value={config.username}
                          onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="yourname"
                        />
                        <Button size="icon" variant="outline" onClick={copyLink}>
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Display Name</label>
                      <Input
                        value={config.name}
                        onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your Name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Bio</label>
                      <Textarea
                        value={config.bio}
                        onChange={(e) => setConfig(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell people about yourself..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Avatar URL</label>
                      <Input
                        value={config.avatar || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, avatar: e.target.value }))}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Social Links</CardTitle>
                    <CardDescription>Connect your social profiles</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Instagram className="w-5 h-5 text-muted-foreground" />
                      <Input
                        value={config.socialLinks.instagram || ''}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                        }))}
                        placeholder="username"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Twitter className="w-5 h-5 text-muted-foreground" />
                      <Input
                        value={config.socialLinks.twitter || ''}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                        }))}
                        placeholder="username"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Linkedin className="w-5 h-5 text-muted-foreground" />
                      <Input
                        value={config.socialLinks.linkedin || ''}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, linkedin: e.target.value }
                        }))}
                        placeholder="username"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Youtube className="w-5 h-5 text-muted-foreground" />
                      <Input
                        value={config.socialLinks.youtube || ''}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                        }))}
                        placeholder="channel"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <Input
                        value={config.socialLinks.email || ''}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, email: e.target.value }
                        }))}
                        placeholder="email@example.com"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="links" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Your Links</CardTitle>
                      <CardDescription>Add links to your bio page</CardDescription>
                    </div>
                    <Button onClick={addLink} size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Link
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {config.links.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No links yet. Add your first link!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.links.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border"
                          >
                            <button className="mt-2 cursor-grab text-muted-foreground hover:text-foreground">
                              <GripVertical className="w-4 h-4" />
                            </button>
                            <div className="flex-1 space-y-2">
                              <Input
                                value={link.title}
                                onChange={(e) => updateLink(link.id, { title: e.target.value })}
                                placeholder="Link title"
                              />
                              <Input
                                value={link.url}
                                onChange={(e) => updateLink(link.id, { url: e.target.value })}
                                placeholder="https://..."
                              />
                            </div>
                            <button
                              onClick={() => removeLink(link.id)}
                              className="mt-2 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="design" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Theme</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-3">
                      {(['light', 'dark', 'gradient', 'custom'] as const).map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setConfig(prev => ({ ...prev, theme }))}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            config.theme === theme
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div
                            className={`w-full h-12 rounded mb-2 ${
                              theme === 'light'
                                ? 'bg-white'
                                : theme === 'dark'
                                ? 'bg-zinc-900'
                                : theme === 'gradient'
                                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                : 'bg-primary/20'
                            }`}
                          />
                          <span className="text-sm capitalize">{theme}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Colors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={config.primaryColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Background Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={config.backgroundColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={config.backgroundColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview */}
          <div className={`${showPreview ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-24">
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-w-sm mx-auto">
                    <BioPagePreview config={config} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BioPagePreview({ config }: { config: BioPageConfig }) {
  const bgStyle = config.theme === 'gradient'
    ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
    : { backgroundColor: config.theme === 'light' ? '#ffffff' : config.backgroundColor };
  
  const textColor = config.theme === 'light' ? '#1a1a1a' : '#ffffff';

  return (
    <div
      className="min-h-[600px] p-6"
      style={bgStyle}
    >
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-24 h-24 rounded-full mb-4 flex items-center justify-center text-2xl font-bold border-4"
          style={{ 
            borderColor: config.primaryColor,
            backgroundColor: config.avatar ? 'transparent' : config.primaryColor + '20',
            color: config.primaryColor,
          }}
        >
          {config.avatar ? (
            <img src={config.avatar} alt={config.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            config.name.charAt(0)
          )}
        </div>
        <h1 className="text-xl font-bold" style={{ color: textColor }}>
          {config.name}
        </h1>
        <p className="text-sm opacity-80 text-center mt-1" style={{ color: textColor }}>
          {config.bio}
        </p>
      </div>

      {/* Social Icons */}
      {Object.values(config.socialLinks).some(Boolean) && (
        <div className="flex justify-center gap-4 mb-6">
          {config.socialLinks.instagram && (
            <Instagram className="w-5 h-5" style={{ color: textColor }} />
          )}
          {config.socialLinks.twitter && (
            <Twitter className="w-5 h-5" style={{ color: textColor }} />
          )}
          {config.socialLinks.linkedin && (
            <Linkedin className="w-5 h-5" style={{ color: textColor }} />
          )}
          {config.socialLinks.youtube && (
            <Youtube className="w-5 h-5" style={{ color: textColor }} />
          )}
          {config.socialLinks.email && (
            <Mail className="w-5 h-5" style={{ color: textColor }} />
          )}
        </div>
      )}

      {/* Links */}
      <div className="space-y-3">
        {config.links.map((link) => (
          <a
            key={link.id}
            href={link.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-4 rounded-xl text-center font-medium transition-transform hover:scale-[1.02]"
            style={{
              backgroundColor: config.primaryColor + '20',
              color: textColor,
              border: `2px solid ${config.primaryColor}40`,
            }}
          >
            {link.title || 'Untitled Link'}
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs opacity-50" style={{ color: textColor }}>
          Powered by Nexus
        </p>
      </div>
    </div>
  );
}
