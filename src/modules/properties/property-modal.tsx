'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Property, PropertyType, PropertyStatus, PropertyPhotoItem, PropertyVideoItem } from '@/lib/supabase/types';
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
  Film,
  Play,
  ArrowUp,
  Tag,
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
  'Lush Green Park',
  'Visitor Parking',
];

const ROOM_OPTIONS = [
  'Living Room',
  'Master Bedroom',
  'Bedroom',
  'Kitchen',
  'Dining Area',
  'Balcony',
  'Bathroom',
  'Exterior',
  'Lobby / Reception',
  'Floor Plan',
  'Terrace Garden',
  'Office Area',
  'Showroom',
  'General',
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
    listingType: 'sale' as 'sale' | 'rent' | 'lease',
    status: 'available' as PropertyStatus,
    bhk: '2 BHK',
    price: '',
    sizeSqft: '',
    bedrooms: '2',
    bathrooms: '2',
    location: '',
    address: '',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226010',
    description: '',
    ownerName: '',
    ownerPhone: '',
    videoUrl: '',
    documentUrl: '',
    view360Url: '',
    assignedAgentId: '',
    amenities: [] as string[],
    photos: [] as PropertyPhotoItem[],
    videos: [] as PropertyVideoItem[],
  });

  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [photoInputRoom, setPhotoInputRoom] = useState('Living Room');
  const [photoInputCaption, setPhotoInputCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [videoInputUrl, setVideoInputUrl] = useState('');
  const [videoInputTitle, setVideoInputTitle] = useState('');
  const [videoInputRoom, setVideoInputRoom] = useState('Full Property');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (property) {
      // Normalize photos to objects
      const normalizedPhotos: PropertyPhotoItem[] = (property.photos || []).map((p, idx) => {
        if (typeof p === 'string') {
          return { url: p, room: idx === 0 ? 'Exterior' : 'Living Room', caption: '' };
        }
        return {
          url: p.url,
          room: p.room || 'General',
          caption: p.caption || '',
        };
      });

      // Normalize videos
      const initialVideos: PropertyVideoItem[] = (property.videos || []).map((v) => ({
        url: v.url,
        title: v.title || 'Property Video Tour',
        room: v.room || 'Full Property',
        type: v.type || 'direct',
      }));

      // If legacy video_url exists but not in videos array
      if (property.video_url && !initialVideos.some((v) => v.url === property.video_url)) {
        initialVideos.push({
          url: property.video_url,
          title: 'Walkthrough Tour',
          room: 'Full Property',
          type: 'direct',
        });
      }

      setFormData({
        title: property.title || '',
        propertyType: property.property_type || 'resale',
        listingType: property.listing_type || 'sale',
        status: property.status || 'available',
        bhk: property.bhk || '',
        price: property.price ? property.price.toString() : '',
        sizeSqft: property.size_sqft ? property.size_sqft.toString() : '',
        bedrooms: property.bedrooms ? property.bedrooms.toString() : '',
        bathrooms: property.bathrooms ? property.bathrooms.toString() : '',
        location: property.location || '',
        address: property.address || '',
        city: property.city || 'Lucknow',
        state: property.state || 'Uttar Pradesh',
        pincode: property.pincode || '226010',
        description: property.description || '',
        ownerName: property.owner_name || '',
        ownerPhone: property.owner_phone || '',
        videoUrl: property.video_url || '',
        documentUrl: property.document_url || '',
        view360Url: property.view_360_url || '',
        assignedAgentId: property.assigned_agent_id || '',
        amenities: property.amenities || [],
        photos: normalizedPhotos,
        videos: initialVideos,
      });
    } else {
      setFormData({
        title: '',
        propertyType: 'resale',
        listingType: 'sale',
        status: 'available',
        bhk: '2 BHK',
        price: '',
        sizeSqft: '',
        bedrooms: '2',
        bathrooms: '2',
        location: '',
        address: '',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        pincode: '226010',
        description: '',
        ownerName: '',
        ownerPhone: '',
        videoUrl: '',
        documentUrl: '',
        view360Url: '',
        assignedAgentId: '',
        amenities: ['Covered Parking', 'Elevator / Lift', '24x7 Security & CCTV'],
        photos: [],
        videos: [],
      });
    }
    setErrorMessage('');
  }, [property, isOpen]);

  // Handle batch image upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingPhoto(true);
      const newItems: PropertyPhotoItem[] = [];

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
          // Infer room tag from file name or default
          const nameLower = file.name.toLowerCase();
          let room = photoInputRoom || 'Living Room';
          if (nameLower.includes('bed')) room = 'Master Bedroom';
          else if (nameLower.includes('kit')) room = 'Kitchen';
          else if (nameLower.includes('ext') || nameLower.includes('facade')) room = 'Exterior';
          else if (nameLower.includes('balc')) room = 'Balcony';
          else if (nameLower.includes('bath')) room = 'Bathroom';

          newItems.push({
            url: data.publicUrl,
            room,
            caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          });
        }
      }

      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...newItems],
      }));
    } catch (err) {
      console.error('Failed to upload photos:', err);
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Add photo via URL
  const addPhotoUrl = () => {
    if (!photoInputUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      photos: [
        ...prev.photos,
        {
          url: photoInputUrl.trim(),
          room: photoInputRoom || 'Living Room',
          caption: photoInputCaption.trim(),
        },
      ],
    }));
    setPhotoInputUrl('');
    setPhotoInputCaption('');
  };

  // Update room tag for a photo
  const updatePhotoRoom = (index: number, newRoom: string) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((p, i) => (i === index ? { ...p, room: newRoom } : p)),
    }));
  };

  // Update caption for a photo
  const updatePhotoCaption = (index: number, newCaption: string) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((p, i) => (i === index ? { ...p, caption: newCaption } : p)),
    }));
  };

  // Move photo to cover (first position)
  const setCoverPhoto = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const items = [...prev.photos];
      const [item] = items.splice(index, 1);
      items.unshift(item);
      return { ...prev, photos: items };
    });
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  // Handle batch video upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingVideo(true);
      const newVideos: PropertyVideoItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('bucket', 'property-videos');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });

        const data = await res.json();
        if (res.ok && data.publicUrl) {
          newVideos.push({
            url: data.publicUrl,
            title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            room: videoInputRoom || 'Full Property',
            type: 'upload',
          });
        }
      }

      setFormData((prev) => ({
        ...prev,
        videos: [...prev.videos, ...newVideos],
        videoUrl: prev.videoUrl || (newVideos[0]?.url || ''),
      }));
    } catch (err) {
      console.error('Failed to upload video:', err);
    } finally {
      setIsUploadingVideo(false);
      e.target.value = '';
    }
  };

  // Add video via URL (YouTube/Vimeo/Direct)
  const addVideoUrl = () => {
    if (!videoInputUrl.trim()) return;
    const url = videoInputUrl.trim();
    let type: 'youtube' | 'vimeo' | 'direct' = 'direct';
    if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
    else if (url.includes('vimeo.com')) type = 'vimeo';

    const newVideo: PropertyVideoItem = {
      url,
      title: videoInputTitle.trim() || 'Property Video Walkthrough',
      room: videoInputRoom || 'Full Property',
      type,
    };

    setFormData((prev) => ({
      ...prev,
      videos: [...prev.videos, newVideo],
      videoUrl: prev.videoUrl || url,
    }));

    setVideoInputUrl('');
    setVideoInputTitle('');
  };

  const removeVideo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
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
        property_type: formData.propertyType,
        propertyType: formData.propertyType,
        listing_type: formData.listingType,
        listingType: formData.listingType,
        status: formData.status,
        bhk: formData.bhk,
        price: Number(formData.price),
        size_sqft: formData.sizeSqft ? Number(formData.sizeSqft) : null,
        sizeSqft: formData.sizeSqft ? Number(formData.sizeSqft) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms, 10) : null,
        location: formData.location,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        description: formData.description,
        owner_name: formData.ownerName,
        ownerName: formData.ownerName,
        owner_phone: formData.ownerPhone,
        ownerPhone: formData.ownerPhone,
        photos: formData.photos,
        videos: formData.videos,
        video_url: formData.videoUrl || (formData.videos[0]?.url || null),
        videoUrl: formData.videoUrl || (formData.videos[0]?.url || null),
        document_url: formData.documentUrl || null,
        view_360_url: formData.view360Url || null,
        view360Url: formData.view360Url || null,
        assigned_agent_id: formData.assignedAgentId || null,
        assignedAgentId: formData.assignedAgentId || null,
        amenities: formData.amenities,
      };

      const url = isEditing ? `/api/properties/${property.id}` : '/api/properties';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save property listing');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error submitting form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Property: ${property.title}` : 'Add New Property Listing'}
      description="Enter comprehensive property specifications, multiple room photos, videos, and virtual tours"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[80vh] overflow-y-auto px-1 pr-2">
        {errorMessage && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Section 1: Basic Information */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Property Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. Omaxe Waterscapes 3 BHK Luxury Flat"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Property Category *</label>
            <select
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as PropertyType })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Listing Intent</label>
            <select
              value={formData.listingType}
              onChange={(e) => setFormData({ ...formData, listingType: e.target.value as 'sale' | 'rent' | 'lease' })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
              <option value="lease">Commercial Lease</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Current Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as PropertyStatus })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              {PROPERTY_STATUSES.map((s) => (
                <option key={s.id} value={s.id} className="capitalize">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Expected Price / Rent (₹) *</label>
            <input
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. 9500000"
            />
          </div>
        </div>

        {/* Section 2: Property Specifications */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">BHK Configuration</label>
            <input
              type="text"
              value={formData.bhk}
              onChange={(e) => setFormData({ ...formData, bhk: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
              placeholder="3 BHK"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Super Area (Sq.Ft)</label>
            <input
              type="number"
              min="0"
              value={formData.sizeSqft}
              onChange={(e) => setFormData({ ...formData, sizeSqft: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
              placeholder="1750"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Bedrooms</label>
            <input
              type="number"
              min="0"
              value={formData.bedrooms}
              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Bathrooms</label>
            <input
              type="number"
              min="0"
              value={formData.bathrooms}
              onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            />
          </div>
        </div>

        {/* Section 3: Location Details */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Locality / Sector *</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. Gomti Nagar Extension"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="Lucknow"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Pincode</label>
            <input
              type="text"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="226010"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700">Full Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="Tower 4, Omaxe Waterscapes, Sector 7, Gomti Nagar Extension"
            />
          </div>
        </div>

        {/* Section 4: Owner & Assigned Agent */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">Owner / Seller Name</label>
            <div className="relative mt-1">
              <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
                placeholder="Dr. Alok Srivastava"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Owner Phone Number</label>
            <div className="relative mt-1">
              <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="tel"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
                placeholder="+91 98390 12345"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Assigned Agent</label>
            <select
              value={formData.assignedAgentId}
              onChange={(e) => setFormData({ ...formData, assignedAgentId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.profile?.full_name || 'Agent'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 5: MULTIPLE PROPERTY PHOTOS & ROOM TAGGING */}
        <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/20 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-amber-600" />
              Property Photos & Room Explorer ({formData.photos.length} uploaded)
            </h4>
            <span className="text-[11px] text-amber-800 font-medium">
              Tag rooms: Living Room, Bedroom, Kitchen, Balcony, etc.
            </span>
          </div>

          {/* Upload Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg border border-slate-200">
            <div className="sm:col-span-4">
              <label className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-500/20 cursor-pointer transition-colors shadow-xs">
                <Upload className="h-4 w-4 text-amber-700" />
                <span>{isUploadingPhoto ? 'Uploading Photos...' : 'Upload Room Images (Multiple)'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>

            <div className="sm:col-span-3">
              <select
                value={photoInputRoom}
                onChange={(e) => setPhotoInputRoom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800 focus:outline-hidden bg-white"
                title="Select default room for added photo"
              >
                {ROOM_OPTIONS.map((room) => (
                  <option key={room} value={room}>
                    Room: {room}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <input
                type="url"
                value={photoInputUrl}
                onChange={(e) => setPhotoInputUrl(e.target.value)}
                placeholder="Or paste image URL"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-hidden bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={addPhotoUrl}
                disabled={!photoInputUrl.trim()}
                className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* Photos Grid with Room Tags & Captions */}
          {formData.photos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {formData.photos.map((item, idx) => (
                <div
                  key={idx}
                  className="relative rounded-lg border border-slate-200 bg-white p-2 shadow-xs flex flex-col justify-between group"
                >
                  <div className="relative h-28 w-full rounded-md overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.caption || item.room} className="h-full w-full object-cover" />

                    {/* Room Badge Pill */}
                    <div className="absolute top-1.5 left-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0f172a]/90 text-amber-400 backdrop-blur-xs shadow-xs">
                        <Tag className="h-2.5 w-2.5" />
                        {item.room || 'General'}
                      </span>
                    </div>

                    {/* Cover Photo Badge */}
                    {idx === 0 && (
                      <div className="absolute bottom-1.5 left-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white shadow-xs">
                          COVER PHOTO
                        </span>
                      </div>
                    )}

                    {/* Quick Action Overlay */}
                    <div className="absolute top-1.5 right-1.5 flex gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => setCoverPhoto(idx)}
                          title="Make Cover Photo"
                          className="h-6 w-6 rounded bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        title="Delete photo"
                        className="h-6 w-6 rounded bg-red-600/80 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Room Selector & Caption */}
                  <div className="mt-2 space-y-1.5">
                    <select
                      value={item.room || 'Living Room'}
                      onChange={(e) => updatePhotoRoom(idx, e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-800 focus:outline-hidden bg-slate-50"
                    >
                      {ROOM_OPTIONS.map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={item.caption || ''}
                      onChange={(e) => updatePhotoCaption(idx, e.target.value)}
                      placeholder="Caption (e.g. Garden Balcony)"
                      className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
              No photos added yet. Upload room photos (Living room, bedroom, kitchen, exterior) or paste URLs above.
            </div>
          )}
        </div>

        {/* Section 6: MULTIPLE VIDEOS & WALKTHROUGHS */}
        <div className="space-y-3 rounded-xl border border-blue-200/80 bg-blue-50/20 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Film className="h-4 w-4 text-blue-600" />
              Property Walkthrough Videos ({formData.videos.length} added)
            </h4>
            <span className="text-[11px] text-blue-800 font-medium">
              Upload video clips (.mp4) or attach YouTube / Vimeo links
            </span>
          </div>

          {/* Video Add / Upload Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg border border-slate-200">
            <div className="sm:col-span-4">
              <label className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-400 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-500/20 cursor-pointer transition-colors shadow-xs">
                <Video className="h-4 w-4 text-blue-600" />
                <span>{isUploadingVideo ? 'Uploading Video...' : 'Upload Video File (.mp4)'}</span>
                <input
                  type="file"
                  multiple
                  accept="video/mp4,video/webm,video/*"
                  onChange={handleVideoUpload}
                  disabled={isUploadingVideo}
                  className="hidden"
                />
              </label>
            </div>

            <div className="sm:col-span-3">
              <select
                value={videoInputRoom}
                onChange={(e) => setVideoInputRoom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800 focus:outline-hidden bg-white"
              >
                <option value="Full Property">Area: Full Tour</option>
                <option value="Living Room">Area: Living Room</option>
                <option value="Master Suite">Area: Master Suite</option>
                <option value="Balcony & Views">Area: Balcony & Views</option>
                <option value="Clubhouse & Campus">Area: Clubhouse & Campus</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <input
                type="url"
                value={videoInputUrl}
                onChange={(e) => setVideoInputUrl(e.target.value)}
                placeholder="Or YouTube / MP4 URL"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-hidden bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={addVideoUrl}
                disabled={!videoInputUrl.trim()}
                className="w-full rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-40 transition-colors"
              >
                Add Link
              </button>
            </div>
          </div>

          {/* Videos List */}
          {formData.videos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {formData.videos.map((vid, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Play className="h-5 w-5 fill-current" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-slate-900 truncate">{vid.title || 'Video Tour'}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {vid.room || 'Full Property'}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">{vid.type || 'direct'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeVideo(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove video"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 7: 360 PANORAMA TOUR */}
        <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-2">
          <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-amber-600" />
            360° Equirectangular Panorama Tour URL
          </label>
          <input
            type="url"
            value={formData.view360Url}
            onChange={(e) => setFormData({ ...formData, view360Url: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
            placeholder="https://...equirectangular-360.jpg"
          />
          <p className="text-[11px] text-slate-400">
            Link an equirectangular panorama image to enable 360° virtual tour exploration.
          </p>
        </div>

        {/* Section 8: Key Amenities */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Key Amenities</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMMON_AMENITIES.map((amenity) => {
              const isSelected = formData.amenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-left transition-colors ${
                    isSelected
                      ? 'border-amber-400 bg-amber-50/70 text-amber-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'}`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                  <span className="truncate">{amenity}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 9: Detailed Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700">Detailed Description</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
            placeholder="Highlight view, high floor, modular Italian kitchen, wooden flooring, Vastu compliance, proximity to landmarks..."
          />
        </div>

        {/* Actions Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-3 sticky bottom-0 bg-white/95 backdrop-blur-xs py-2">
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
