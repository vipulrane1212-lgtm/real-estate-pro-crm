'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Property, PropertyType, PropertyStatus } from '@/lib/supabase/types';
import {
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  Compass,
  Video,
  FileText,
  User,
  Phone,
  Check,
} from 'lucide-react';

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  property?: Property | null;
  employees: Array<{ id: string; profile?: { full_name: string } }>;
}

const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
  { id: 'new_project', label: 'New Project' },
  { id: 'resale', label: 'Resale' },
  { id: 'rental', label: 'Rental' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'plot_land', label: 'Plot / Land' },
];

const PROPERTY_STATUSES: { id: PropertyStatus; label: string }[] = [
  { id: 'available', label: 'Available' },
  { id: 'hold', label: 'Hold' },
  { id: 'sold', label: 'Sold' },
  { id: 'rented', label: 'Rented' },
];

const COMMON_AMENITIES = [
  'Covered Parking',
  'Elevator / Lift',
  '24x7 Security & CCTV',
  'Clubhouse',
  'Swimming Pool',
  'Gymnasium',
  'Power Backup',
  'Gated Community',
  'Piped Gas',
  'Intercom',
];

export function PropertyModal({
  isOpen,
  onClose,
  onSuccess,
  property,
  employees,
}: PropertyModalProps) {
  const isEditing = !!property;

  const [formData, setFormData] = useState({
    title: '',
    propertyType: 'resale' as PropertyType,
    status: 'available' as PropertyStatus,
    bhk: '2 BHK',
    price: '',
    sizeSqft: '',
    bedrooms: '2',
    bathrooms: '2',
    location: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '',
    description: '',
    ownerName: '',
    ownerPhone: '',
    videoUrl: '',
    documentUrl: '',
    view360Url: '',
    assignedAgentId: '',
    amenities: [] as string[],
    photos: [] as string[],
  });

  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || '',
        propertyType: property.property_type || 'resale',
        status: property.status || 'available',
        bhk: property.bhk || '',
        price: property.price ? property.price.toString() : '',
        sizeSqft: property.size_sqft ? property.size_sqft.toString() : '',
        bedrooms: property.bedrooms ? property.bedrooms.toString() : '',
        bathrooms: property.bathrooms ? property.bathrooms.toString() : '',
        location: property.location || '',
        address: property.address || '',
        city: property.city || 'Mumbai',
        state: property.state || 'Maharashtra',
        pincode: property.pincode || '',
        description: property.description || '',
        ownerName: property.owner_name || '',
        ownerPhone: property.owner_phone || '',
        videoUrl: property.video_url || '',
        documentUrl: property.document_url || '',
        view360Url: property.view_360_url || '',
        assignedAgentId: property.assigned_agent_id || '',
        amenities: property.amenities || [],
        photos: property.photos || [],
      });
    } else {
      setFormData({
        title: '',
        propertyType: 'resale',
        status: 'available',
        bhk: '2 BHK',
        price: '',
        sizeSqft: '',
        bedrooms: '2',
        bathrooms: '2',
        location: '',
        address: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '',
        description: '',
        ownerName: '',
        ownerPhone: '',
        videoUrl: '',
        documentUrl: '',
        view360Url: '',
        assignedAgentId: '',
        amenities: ['Covered Parking', 'Elevator / Lift', '24x7 Security & CCTV'],
        photos: [],
      });
    }
    setErrorMessage('');
  }, [property, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingPhoto(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('bucket', 'property-photos');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });

        const data = await res.json();
        if (res.ok && data.publicUrl) {
          setFormData(prev => ({
            ...prev,
            photos: [...prev.photos, data.publicUrl],
          }));
        }
      }
    } catch (err) {
      console.error('Failed to upload photos:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const addPhotoUrl = () => {
    if (!photoInputUrl.trim()) return;
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, photoInputUrl.trim()],
    }));
    setPhotoInputUrl('');
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.location || !formData.address) {
      setErrorMessage('Please fill in Title, Price, Location, and Address');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const payload = {
        title: formData.title,
        propertyType: formData.propertyType,
        status: formData.status,
        bhk: formData.bhk,
        price: Number(formData.price),
        sizeSqft: formData.sizeSqft ? Number(formData.sizeSqft) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms, 10) : null,
        location: formData.location,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        description: formData.description,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        videoUrl: formData.videoUrl,
        documentUrl: formData.documentUrl,
        view360Url: formData.view360Url,
        assignedAgentId: formData.assignedAgentId || null,
        amenities: formData.amenities,
        photos: formData.photos,
      };

      const url = isEditing ? `/api/properties/${property.id}` : '/api/properties';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save property listing');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error saving property');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Property Listing' : 'Add New Property Listing'}
      description="Create or modify property specifications, media, and pricing."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Basic Title & Categorization */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Property Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="Luxurious 2 BHK Apartment in Andheri West"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Property Type *</label>
            <select
              value={formData.propertyType}
              onChange={e => setFormData({ ...formData, propertyType: e.target.value as PropertyType })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              {PROPERTY_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Inventory Status *</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as PropertyStatus })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              {PROPERTY_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Specs: BHK, Price, Area */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700">BHK / Size Category</label>
            <input
              type="text"
              value={formData.bhk}
              onChange={e => setFormData({ ...formData, bhk: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. 2 BHK, 3 BHK, 1200 Sq.Ft"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Price (₹ INR) *</label>
            <input
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. 15000000 (1.5 Cr)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Carpet / Built-up (Sq.Ft)</label>
            <input
              type="number"
              min="0"
              value={formData.sizeSqft}
              onChange={e => setFormData({ ...formData, sizeSqft: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. 850"
            />
          </div>
        </div>

        {/* Location & Address */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Location / Prime Area *</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. Andheri West, Bandra, Worli"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Assigned Agent</label>
            <select
              value={formData.assignedAgentId}
              onChange={e => setFormData({ ...formData, assignedAgentId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="">Unassigned</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.profile?.full_name || 'Agent'}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Full Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. Flat 1204, Oberoi Springs, Link Road, Andheri West"
            />
          </div>
        </div>

        {/* Owner Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">Owner / Seller Name</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
                placeholder="Mr. Rajesh Mehta"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Owner Contact Mobile</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                value={formData.ownerPhone}
                onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
                placeholder="+91 98200 12345"
              />
            </div>
          </div>
        </div>

        {/* Media & 360 Tour */}
        <div className="space-y-3 rounded-lg border border-slate-200 p-3 bg-white">
          <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-amber-600" />
            Media & Virtual Tours
          </h4>

          {/* Photo Uploader */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
              Property Photos
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.photos.map((photo, idx) => (
                <div key={idx} className="relative h-16 w-16 rounded-lg border border-slate-200 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute inset-0 bg-red-600/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Image'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>

              <div className="flex flex-1 gap-1.5">
                <input
                  type="url"
                  value={photoInputUrl}
                  onChange={e => setPhotoInputUrl(e.target.value)}
                  placeholder="Or paste image URL"
                  className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={addPhotoUrl}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* 360 View URL and Video URL */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-amber-600" />
                360° Photo Panorama URL
              </label>
              <input
                type="url"
                value={formData.view360Url}
                onChange={e => setFormData({ ...formData, view360Url: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                placeholder="https://...equirectangular-360.jpg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 flex items-center gap-1">
                <Video className="h-3.5 w-3.5 text-blue-600" />
                Video Walkthrough URL
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                placeholder="YouTube / Vimeo link"
              />
            </div>
          </div>
        </div>

        {/* Amenities Checkboxes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Key Amenities</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMMON_AMENITIES.map(amenity => {
              const isSelected = formData.amenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-left transition-colors ${
                    isSelected
                      ? 'border-amber-400 bg-amber-50/70 text-amber-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'}`}>
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                  <span className="truncate">{amenity}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700">Detailed Description</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
            placeholder="Highlight view, high floor, modular kitchen, vastu compliance, etc."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Listing'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
