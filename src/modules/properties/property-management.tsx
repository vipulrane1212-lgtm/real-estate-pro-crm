'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Property, PropertyType, PropertyStatus } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PropertyModal } from './property-modal';
import { Property360Viewer } from './property-360-viewer';
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

  // 360 Viewer Modal
  const [viewing360Property, setViewing360Property] = useState<Property | null>(null);

  // Gallery Modal
  const [galleryProperty, setGalleryProperty] = useState<Property | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

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
        setProperties(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete property:', err);
    }
  };

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
            Residential & commercial inventory, photo galleries, and 360° virtual tours
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5">
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
      <Card className="p-4 bg-white">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title, code, BHK..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={e => {
                setTypeFilter(e.target.value);
                setTimeout(fetchProperties, 50);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="all">All Types</option>
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
              onChange={e => {
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
              onChange={e => setLocationFilter(e.target.value)}
              placeholder="Location (e.g. Andheri)"
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
          title="No data yet"
          description="No property listings match your current filter criteria. Click 'Add Property' to add your first real estate listing."
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
          {properties.map(property => {
            const hasPhotos = property.photos && property.photos.length > 0;
            const primaryPhoto = hasPhotos ? property.photos[0] : null;

            return (
              <Card
                key={property.id}
                className="overflow-hidden p-0 transition-all hover:border-slate-300 hover:shadow-md flex flex-col group"
              >
                {/* Photo & Badge Banner */}
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
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
                      <span className="mt-1 text-xs">No photos uploaded</span>
                    </div>
                  )}

                  {/* Badges on image */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <Badge variant={STATUS_VARIANTS[property.status]} className="capitalize font-semibold shadow-xs">
                      {property.status}
                    </Badge>
                    <Badge variant="navy" className="text-[10px] shadow-xs">
                      {TYPE_LABELS[property.property_type] || property.property_type}
                    </Badge>
                  </div>

                  {/* 360 Tour & Gallery Overlay Buttons */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                    {property.view_360_url && (
                      <button
                        onClick={() => setViewing360Property(property)}
                        className="inline-flex items-center gap-1 rounded-full bg-[#0f172a]/90 px-2.5 py-1 text-[11px] font-semibold text-amber-400 backdrop-blur-xs hover:bg-[#0f172a] shadow-xs border border-amber-400/40"
                      >
                        <Compass className="h-3 w-3" />
                        360° Tour
                      </button>
                    )}

                    {hasPhotos && (
                      <button
                        onClick={() => {
                          setGalleryProperty(property);
                          setActiveGalleryIndex(0);
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs hover:bg-slate-900 shadow-xs"
                      >
                        <ImageIcon className="h-3 w-3" />
                        {property.photos.length}
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-[#0f172a]">
                        {formatPriceINR(Number(property.price))}
                      </span>
                      {property.bhk && (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {property.bhk}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-semibold text-slate-900 line-clamp-1" title={property.title}>
                      {property.title}
                    </h3>

                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{property.location || property.city}</span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                      {property.description || property.address}
                    </p>
                  </div>

                  {/* Card Footer: Agent and Actions */}
                  <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 truncate max-w-[150px]">
                      Agent: {property.assigned_agent?.profile?.full_name || 'Unassigned'}
                    </span>

                    <div className="flex items-center gap-1">
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
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">BHK / Size</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner Contact</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {properties.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.title}</div>
                      <div className="text-[11px] text-slate-400">{p.property_code || p.address}</div>
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
                        {p.view_360_url && (
                          <button
                            onClick={() => setViewing360Property(p)}
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                            title="360 Tour"
                          >
                            <Compass className="h-3.5 w-3.5" />
                          </button>
                        )}
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
                ))}
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

      {/* 360 Tour Viewer Modal */}
      <Modal
        isOpen={!!viewing360Property}
        onClose={() => setViewing360Property(null)}
        title={`360° Virtual Tour: ${viewing360Property?.title || ''}`}
        description="Equirectangular interactive panorama tour"
        maxWidth="xl"
      >
        <div className="space-y-4">
          <Property360Viewer imageUrl={viewing360Property?.view_360_url} propertyTitle={viewing360Property?.title} />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewing360Property(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Photo Gallery Modal */}
      <Modal
        isOpen={!!galleryProperty}
        onClose={() => setGalleryProperty(null)}
        title={`Photo Gallery (${galleryProperty?.photos?.length || 0}): ${galleryProperty?.title || ''}`}
        maxWidth="xl"
      >
        {galleryProperty && galleryProperty.photos && galleryProperty.photos.length > 0 && (
          <div className="space-y-4">
            <div className="relative h-80 w-full overflow-hidden rounded-xl bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={galleryProperty.photos[activeGalleryIndex]}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {galleryProperty.photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setActiveGalleryIndex(i)}
                  className={`h-16 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeGalleryIndex === i ? 'border-amber-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setGalleryProperty(null)}>
                Close Gallery
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
