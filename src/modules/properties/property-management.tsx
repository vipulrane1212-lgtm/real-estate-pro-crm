'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MapPin,
  Home,
  IndianRupee,
  Layers,
  Image as ImageIcon,
  Compass,
  Eye,
  Edit2,
  Trash2,
  Phone,
  User,
  LayoutGrid,
  List,
  RefreshCw,
  ExternalLink,
  FileText,
  Play,
  Film,
  Tag,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from 'lucide-react';
import { Property, PropertyType, PropertyStatus } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PropertyModal } from './property-modal';
import { Property360Viewer } from './property-360-viewer';
import { DocumentUploadModal } from '@/modules/documents/document-upload-modal';
import { Modal } from '@/components/ui/modal';

function formatPriceINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

const TYPE_LABELS: Record<string, string> = {
  new_project: 'New Project',
  resale: 'Resale',
  rental: 'Rental',
  commercial: 'Commercial',
  plot_land: 'Plot / Land',
};

const STATUS_VARIANTS: Record<PropertyStatus, 'success' | 'warning' | 'default' | 'danger'> = {
  available: 'success',
  hold: 'warning',
  sold: 'danger',
  rented: 'default',
};

interface NormalizedMedia {
  id: string;
  type: 'photo' | 'video' | '360';
  url: string;
  room: string;
  title: string;
  caption?: string;
  videoType?: string;
}

function getPropertyMedia(property: Property | null): NormalizedMedia[] {
  if (!property) return [];
  const media: NormalizedMedia[] = [];

  // 1. Photos
  (property.photos || []).forEach((p, idx) => {
    if (typeof p === 'string') {
      media.push({
        id: `photo-${idx}`,
        type: 'photo',
        url: p,
        room: idx === 0 ? 'Exterior' : 'Living Room',
        title: `Photo ${idx + 1}`,
        caption: '',
      });
    } else if (p && p.url) {
      media.push({
        id: `photo-${idx}`,
        type: 'photo',
        url: p.url,
        room: p.room || 'General',
        title: p.room || `Photo ${idx + 1}`,
        caption: p.caption || '',
      });
    }
  });

  // 2. Videos
  if (property.videos && property.videos.length > 0) {
    property.videos.forEach((v, idx) => {
      media.push({
        id: `video-${idx}`,
        type: 'video',
        url: v.url,
        room: v.room || 'Full Property',
        title: v.title || `Walkthrough Video ${idx + 1}`,
        videoType: v.type || 'direct',
      });
    });
  } else if (property.video_url) {
    media.push({
      id: 'video-legacy',
      type: 'video',
      url: property.video_url,
      room: 'Full Property',
      title: 'Walkthrough Video Tour',
      videoType: 'direct',
    });
  }

  // 3. 360 Tour
  if (property.view_360_url) {
    media.push({
      id: 'tour-360',
      type: '360',
      url: property.view_360_url,
      room: '360° Virtual Tour',
      title: '360° Panorama Tour',
    });
  }

  return media;
}

export function PropertyManagement() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; profile?: { full_name: string } }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // 360 Viewer Modal standalone
  const [viewing360Property, setViewing360Property] = useState<Property | null>(null);

  // Media Explorer & Room Gallery Modal
  const [galleryProperty, setGalleryProperty] = useState<Property | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');

  // Document Upload Modal
  const [uploadDocProperty, setUploadDocProperty] = useState<Property | null>(null);

  const fetchProperties = async () => {
    try {
      setIsRefreshing(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (locationFilter) params.set('location', locationFilter);

      const res = await fetch(`/api/properties?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch (err) {
      console.error('Failed to load properties:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchEmployees();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProperties();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete property listing "${title}"?`)) return;

    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete property:', err);
    }
  };

  // Compute all media for currently open gallery modal
  const allPropertyMedia = useMemo(() => {
    return getPropertyMedia(galleryProperty);
  }, [galleryProperty]);

  // Unique room categories for filter tabs
  const roomFilterOptions = useMemo(() => {
    if (!galleryProperty) return [];
    const rooms = new Set<string>();
    allPropertyMedia.forEach((m) => {
      if (m.room) rooms.add(m.room);
    });
    return Array.from(rooms);
  }, [allPropertyMedia, galleryProperty]);

  // Media items filtered by chosen room
  const filteredMedia = useMemo(() => {
    if (selectedRoomFilter === 'all') return allPropertyMedia;
    return allPropertyMedia.filter((m) => m.room === selectedRoomFilter);
  }, [allPropertyMedia, selectedRoomFilter]);

  const activeMedia = filteredMedia[activeMediaIndex] || filteredMedia[0] || null;

  const handleNextMedia = useCallback(() => {
    if (filteredMedia.length <= 1) return;
    setActiveMediaIndex((prev) => (prev + 1) % filteredMedia.length);
  }, [filteredMedia.length]);

  const handlePrevMedia = useCallback(() => {
    if (filteredMedia.length <= 1) return;
    setActiveMediaIndex((prev) => (prev - 1 + filteredMedia.length) % filteredMedia.length);
  }, [filteredMedia.length]);

  // Keyboard navigation for gallery
  useEffect(() => {
    if (!galleryProperty) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNextMedia();
      else if (e.key === 'ArrowLeft') handlePrevMedia();
      else if (e.key === 'Escape') setGalleryProperty(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryProperty, handleNextMedia, handlePrevMedia]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Property Inventory
            </h1>
            <Badge variant="navy" className="text-xs">
              {properties.length} Listings
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Residential & commercial properties, multi-room photo galleries, videos, and 360° virtual tours
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#0f172a] text-white' : 'text-slate-500 hover:text-slate-900'}`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'table' ? 'bg-[#0f172a] text-white' : 'text-slate-500 hover:text-slate-900'}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchProperties}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingProperty(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 bg-white shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, code, BHK, locality..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setTimeout(fetchProperties, 50);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="all">All Property Types</option>
              <option value="new_project">New Project</option>
              <option value="resale">Resale</option>
              <option value="rental">Rental</option>
              <option value="commercial">Commercial</option>
              <option value="plot_land">Plot / Land</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setTimeout(fetchProperties, 50);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="hold">Hold</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Locality (e.g. Gomti Nagar)"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
            />
            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Loading property inventory...</span>
        </div>
      ) : properties.length === 0 ? (
        <EmptyState
          title="No properties found"
          description="No property listings match your current search. Click 'Add Property' to list a new flat, villa, or commercial unit."
          icon={Building2}
          actionText="Add Property Listing"
          onAction={() => {
            setEditingProperty(null);
            setIsModalOpen(true);
          }}
        />
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const mediaList = getPropertyMedia(property);
            const photoCount = property.photos?.length || 0;
            const videoCount = (property.videos?.length || (property.video_url ? 1 : 0));
            const primaryMedia = mediaList.find((m) => m.type === 'photo') || mediaList[0];
            const primaryPhoto = primaryMedia ? primaryMedia.url : null;

            // Extract unique rooms covered in this property
            const roomsCovered = Array.from(
              new Set(
                (property.photos || [])
                  .map((p) => (typeof p === 'object' && p ? p.room : null))
                  .filter(Boolean)
              )
            );

            return (
              <Card
                key={property.id}
                className="overflow-hidden p-0 transition-all hover:border-slate-300 hover:shadow-md flex flex-col group bg-white border border-slate-200"
              >
                {/* Photo & Media Banner */}
                <div
                  className="relative h-52 w-full bg-slate-900 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setGalleryProperty(property);
                    setSelectedRoomFilter('all');
                    setActiveMediaIndex(0);
                  }}
                >
                  {primaryPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={primaryPhoto}
                      alt={property.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                      <Building2 className="h-10 w-10 stroke-1" />
                      <span className="mt-1 text-xs">No media uploaded</span>
                    </div>
                  )}

                  {/* Gradient shadow overlay for text legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                  {/* Badges on image (Top Left) */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <Badge variant={STATUS_VARIANTS[property.status]} className="capitalize font-semibold shadow-xs">
                      {property.status}
                    </Badge>
                    <Badge variant="navy" className="text-[10px] shadow-xs">
                      {TYPE_LABELS[property.property_type] || property.property_type}
                    </Badge>
                  </div>

                  {/* Media Count Pills (Bottom Right) */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                    {property.view_360_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewing360Property(property);
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-[#0f172a]/90 px-2.5 py-1 text-[11px] font-semibold text-amber-400 backdrop-blur-xs hover:bg-[#0f172a] shadow-xs border border-amber-400/40"
                      >
                        <Compass className="h-3 w-3" />
                        360° Tour
                      </button>
                    )}

                    {videoCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs shadow-xs">
                        <Play className="h-3 w-3 fill-current" />
                        {videoCount} {videoCount === 1 ? 'Video' : 'Videos'}
                      </span>
                    )}

                    {photoCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs shadow-xs">
                        <ImageIcon className="h-3 w-3" />
                        {photoCount} {photoCount === 1 ? 'Photo' : 'Photos'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-[#0f172a]">
                        {formatPriceINR(Number(property.price))}
                      </span>
                      {property.bhk && (
                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {property.bhk}
                        </span>
                      )}
                    </div>

                    <h3
                      className="mt-1.5 text-sm font-semibold text-slate-900 line-clamp-1 hover:text-amber-700 cursor-pointer"
                      title={property.title}
                      onClick={() => {
                        setGalleryProperty(property);
                        setSelectedRoomFilter('all');
                        setActiveMediaIndex(0);
                      }}
                    >
                      {property.title}
                    </h3>

                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{property.location || property.city}</span>
                    </div>

                    {/* Room tags preview */}
                    {roomsCovered.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {roomsCovered.slice(0, 4).map((room, rIdx) => (
                          <span
                            key={rIdx}
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                          >
                            <Tag className="h-2.5 w-2.5 text-slate-400" />
                            {room}
                          </span>
                        ))}
                        {roomsCovered.length > 4 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{roomsCovered.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                      {property.description || property.address}
                    </p>
                  </div>

                  {/* Card Footer: Agent & Actions */}
                  <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 truncate max-w-[140px]">
                      Agent: {property.assigned_agent?.profile?.full_name || 'Unassigned'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setGalleryProperty(property);
                          setSelectedRoomFilter('all');
                          setActiveMediaIndex(0);
                        }}
                        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Open Media & Room Explorer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setUploadDocProperty(property)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                        title="Upload Property Documents"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingProperty(property);
                          setIsModalOpen(true);
                        }}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Edit Property"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(property.id, property.title)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 transition-colors"
                        title="Delete Property"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="overflow-hidden p-0 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">BHK / Size</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Media (Rooms/Videos)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner Contact</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {properties.map((p) => {
                  const photoCount = p.photos?.length || 0;
                  const videoCount = (p.videos?.length || (p.video_url ? 1 : 0));
                  const primaryPhoto = p.photos?.[0]
                    ? typeof p.photos[0] === 'string'
                      ? p.photos[0]
                      : p.photos[0].url
                    : null;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-12 rounded bg-slate-100 overflow-hidden shrink-0 cursor-pointer border border-slate-200"
                            onClick={() => {
                              setGalleryProperty(p);
                              setSelectedRoomFilter('all');
                              setActiveMediaIndex(0);
                            }}
                          >
                            {primaryPhoto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Building2 className="h-5 w-5 text-slate-400 m-auto mt-2.5" />
                            )}
                          </div>
                          <div>
                            <div
                              className="font-semibold text-slate-900 hover:text-amber-700 cursor-pointer"
                              onClick={() => {
                                setGalleryProperty(p);
                                setSelectedRoomFilter('all');
                                setActiveMediaIndex(0);
                              }}
                            >
                              {p.title}
                            </div>
                            <div className="text-[11px] text-slate-400">{p.property_code || p.address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {TYPE_LABELS[p.property_type] || p.property_type}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.bhk || '-'}{p.size_sqft ? ` (${p.size_sqft} Sq.Ft)` : ''}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatPriceINR(Number(p.price))}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.location || p.city}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setGalleryProperty(p);
                              setSelectedRoomFilter('all');
                              setActiveMediaIndex(0);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-amber-800 bg-slate-100 hover:bg-amber-50 px-2 py-0.5 rounded border border-slate-200"
                          >
                            <ImageIcon className="h-3 w-3 text-amber-600" />
                            {photoCount}
                          </button>
                          {videoCount > 0 && (
                            <button
                              onClick={() => {
                                setGalleryProperty(p);
                                setSelectedRoomFilter('all');
                                setActiveMediaIndex(0);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              {videoCount}
                            </button>
                          )}
                          {p.view_360_url && (
                            <button
                              onClick={() => setViewing360Property(p)}
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                              title="360° Virtual Tour"
                            >
                              <Compass className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[p.status]} className="capitalize">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <div>{p.owner_name || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400">{p.owner_phone || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setGalleryProperty(p);
                              setSelectedRoomFilter('all');
                              setActiveMediaIndex(0);
                            }}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            title="Media Gallery"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setUploadDocProperty(p)}
                            className="p-1 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded"
                            title="Upload Property Documents"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingProperty(p);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.title)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Property Create/Edit Modal */}
      <PropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProperties}
        property={editingProperty}
        employees={employees}
      />

      {/* Standalone 360 Tour Viewer Modal */}
      <Modal
        isOpen={!!viewing360Property}
        onClose={() => setViewing360Property(null)}
        title={`360° Virtual Tour: ${viewing360Property?.title || ''}`}
        description="Equirectangular interactive panorama tour"
        maxWidth="xl"
      >
        <div className="space-y-4">
          <Property360Viewer
            imageUrl={viewing360Property?.view_360_url}
            propertyTitle={viewing360Property?.title}
          />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewing360Property(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ENHANCED PROPERTY MEDIA & ROOM EXPLORER MODAL */}
      <Modal
        isOpen={!!galleryProperty}
        onClose={() => setGalleryProperty(null)}
        title={galleryProperty ? `${galleryProperty.title}` : 'Media Gallery'}
        description={
          galleryProperty
            ? `${galleryProperty.bhk || ''} • ${formatPriceINR(Number(galleryProperty.price))} • ${galleryProperty.location || galleryProperty.city}`
            : ''
        }
        maxWidth="2xl"
      >
        {galleryProperty && (
          <div className="space-y-4">
            {/* Filter Pills: All Media, Living Room, Bedroom, Kitchen, Videos, etc. */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedRoomFilter('all');
                  setActiveMediaIndex(0);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedRoomFilter === 'all'
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Media ({allPropertyMedia.length})
              </button>

              {roomFilterOptions.map((room) => {
                const count = allPropertyMedia.filter((m) => m.room === room).length;
                return (
                  <button
                    key={room}
                    type="button"
                    onClick={() => {
                      setSelectedRoomFilter(room);
                      setActiveMediaIndex(0);
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedRoomFilter === room
                        ? 'bg-amber-600 text-white font-semibold shadow-xs'
                        : 'bg-amber-50 text-amber-900 border border-amber-200/70 hover:bg-amber-100'
                    }`}
                  >
                    <Tag className="h-3 w-3" />
                    {room} ({count})
                  </button>
                );
              })}
            </div>

            {/* Main Stage Display (Photo / Video / 360 Tour) */}
            {activeMedia ? (
              <div className="relative rounded-2xl bg-black overflow-hidden flex items-center justify-center min-h-[380px] max-h-[520px]">
                {activeMedia.type === 'photo' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeMedia.url}
                    alt={activeMedia.caption || activeMedia.title}
                    className="max-h-[500px] w-full object-contain select-none"
                  />
                )}

                {activeMedia.type === 'video' && (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2">
                    {activeMedia.url.includes('youtube.com') || activeMedia.url.includes('youtu.be') ? (
                      <iframe
                        src={activeMedia.url.replace('watch?v=', 'embed/')}
                        className="w-full h-[440px] rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={activeMedia.url}
                        controls
                        autoPlay
                        className="max-h-[480px] w-full rounded-lg"
                      />
                    )}
                  </div>
                )}

                {activeMedia.type === '360' && (
                  <div className="w-full h-[450px]">
                    <Property360Viewer imageUrl={activeMedia.url} propertyTitle={galleryProperty.title} />
                  </div>
                )}

                {/* Room & Caption Overlay Banner (Bottom) */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-end justify-between pointer-events-none">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-slate-950 shadow-xs">
                        <Tag className="h-3 w-3" />
                        {activeMedia.room}
                      </span>
                      <span className="text-xs text-white/80 font-medium">{activeMedia.title}</span>
                    </div>
                    {activeMedia.caption && (
                      <p className="mt-1 text-sm text-slate-200 font-medium">{activeMedia.caption}</p>
                    )}
                  </div>

                  <span className="text-xs text-white/70 font-semibold bg-black/50 px-2 py-1 rounded backdrop-blur-xs">
                    {activeMediaIndex + 1} / {filteredMedia.length}
                  </span>
                </div>

                {/* Left & Right Arrow Buttons */}
                {filteredMedia.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevMedia}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 hover:scale-105 transition-all shadow-md"
                      title="Previous (Left Arrow)"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMedia}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 hover:scale-105 transition-all shadow-md"
                      title="Next (Right Arrow)"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">No media available for this room tag.</div>
            )}

            {/* Bottom Thumbnail Strip */}
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {filteredMedia.map((media, idx) => (
                <button
                  key={media.id}
                  onClick={() => setActiveMediaIndex(idx)}
                  className={`relative h-20 w-28 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                    activeMediaIndex === idx
                      ? 'border-amber-500 scale-105 shadow-md ring-2 ring-amber-400/40'
                      : 'border-transparent opacity-60 hover:opacity-100 hover:scale-102'
                  }`}
                >
                  {media.type === 'photo' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media.url} alt="" className="h-full w-full object-cover" />
                  )}

                  {media.type === 'video' && (
                    <div className="h-full w-full bg-blue-950 flex flex-col items-center justify-center text-blue-300">
                      <Play className="h-6 w-6 fill-current text-blue-400" />
                      <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Video</span>
                    </div>
                  )}

                  {media.type === '360' && (
                    <div className="h-full w-full bg-amber-950 flex flex-col items-center justify-center text-amber-300">
                      <Compass className="h-6 w-6 text-amber-400" />
                      <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">360° Tour</span>
                    </div>
                  )}

                  {/* Tiny Room Badge Over Thumbnail */}
                  <div className="absolute bottom-1 inset-x-1">
                    <span className="block truncate text-[9px] font-semibold bg-black/75 text-white px-1 py-0.5 rounded text-center">
                      {media.room}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500">
                Tip: Use <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 text-[10px]">←</kbd> and <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 text-[10px]">→</kbd> keyboard arrows to navigate rooms.
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingProperty(galleryProperty);
                    setIsModalOpen(true);
                    setGalleryProperty(null);
                  }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Media / Add Rooms
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setGalleryProperty(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Property Document Upload Modal */}
      {uploadDocProperty && (
        <DocumentUploadModal
          isOpen={!!uploadDocProperty}
          onClose={() => setUploadDocProperty(null)}
          onSuccess={() => {
            fetchProperties();
          }}
          initialPropertyId={uploadDocProperty.id}
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
        />
      )}
    </div>
  );
}
