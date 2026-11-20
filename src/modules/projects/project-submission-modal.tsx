'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Upload, X, Plus } from 'lucide-react';

interface ProjectSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProjectSubmissionModal({
  isOpen,
  onClose,
  onSuccess,
}: ProjectSubmissionModalProps) {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('Residential Apartment');
  const [location, setLocation] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAddPhoto = () => {
    if (!photoInput.trim()) return;
    if (photos.length >= 5) {
      setErrorMessage('Maximum 5 photos allowed');
      return;
    }
    setPhotos([...photos, photoInput.trim()]);
    setPhotoInput('');
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const priceRangeStr =
        priceMin && priceMax
          ? `₹${Number(priceMin).toLocaleString('en-IN')} - ₹${Number(priceMax).toLocaleString('en-IN')}`
          : priceMin
          ? `From ₹${Number(priceMin).toLocaleString('en-IN')}`
          : priceMax
          ? `Up to ₹${Number(priceMax).toLocaleString('en-IN')}`
          : '';

      const res = await fetch('/api/project-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectName,
          project_type: projectType,
          location,
          price_range: priceRangeStr,
          price_min: priceMin ? Number(priceMin) : null,
          price_max: priceMax ? Number(priceMax) : null,
          description,
          photos,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit project');
      }

      onSuccess();
      onClose();
      // Reset form
      setProjectName('');
      setLocation('');
      setPriceMin('');
      setPriceMax('');
      setDescription('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setPhotos([]);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit New Project / Property"
      description="Register a client or external agent project for administrative review and inventory listing."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Project / Property Name *
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. Shalimar Grand Residences"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Project Type *
            </label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="Residential Apartment">Residential Apartment</option>
              <option value="Commercial Shop / Office">Commercial Shop / Office</option>
              <option value="Plot / Land">Plot / Land</option>
              <option value="Villa / Independent House">Villa / Independent House</option>
              <option value="Penthouse / Luxury Flat">Penthouse / Luxury Flat</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Location / Area *
          </label>
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            placeholder="e.g. Gomti Nagar Extension, Lucknow"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Price Min (₹)
            </label>
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. 5000000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Price Max (₹)
            </label>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. 8500000"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h4 className="text-xs font-semibold text-slate-900 mb-2">Client / Submitter Contact</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Contact Name *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="Rajesh Verma"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="client@gmail.com"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Description & Highlights
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            placeholder="Key highlights, unit configurations, builder name, possession timeline..."
          />
        </div>

        {/* Photos (up to 5 local file paths or URLs) */}
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Photos (Up to 5 file paths or image URLs)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={photoInput}
              onChange={(e) => setPhotoInput(e.target.value)}
              placeholder="/uploads/properties/photo1.jpg or image URL"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPhoto}
              disabled={photos.length >= 5}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((p, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                >
                  <Upload className="h-3 w-3 text-slate-400" />
                  <span className="max-w-[200px] truncate">{p}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            Submit Project for Review
          </Button>
        </div>
      </form>
    </Modal>
  );
}
