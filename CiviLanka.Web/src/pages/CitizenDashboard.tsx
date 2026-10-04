import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  PlusCircle,
  Clock,
  CheckCircle2,
  MapPin,
  Shield,
  PhoneCall,
  Loader2,
  ChevronRight,
  Sparkles,
  X,
  Navigation,
  Crosshair,
  ExternalLink,
  Compass,
  Camera,
  UploadCloud,
  Eye,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Copy,
  Check,
  Info,
  School,
  Hospital,
  Building2,
  Users,
  Tag,
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../services/apiService';
import { authService } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

export interface HazardAIAnalysisDto {
  id: string;
  category?: string;
  severity: string;
  riskLevel: string;
  priority: string;
  confidence: number;
  reason: string;
  modelName: string;
  createdAt: string;
}

export interface HazardDto {
  id: string;
  ticketNumber: string;
  category: string;
  description: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  imageUrl?: string;
  status: string;
  severity?: string;
  priority?: string;
  riskLevel?: string;
  createdAt: string;
  updatedAt?: string;
  isCancelled?: boolean;
  latestAIAnalysis?: HazardAIAnalysisDto;
}

const COLOMBO_HOTSPOTS = [
  { name: 'Select Predefined Colombo Hotspot...', lat: '', lng: '' },
  { name: 'Galle Face Green / Fort (6.9271, 79.8433)', lat: '6.927100', lng: '79.843300' },
  { name: 'Kollupitiya Junction / Duplication Rd (6.8970, 79.8560)', lat: '6.897000', lng: '79.856000' },
  { name: 'Bambalapitiya Marine Drive (6.8920, 79.8550)', lat: '6.892000', lng: '79.855000' },
  { name: 'Borella Junction / Baseline Rd (6.9142, 79.8770)', lat: '6.914200', lng: '79.877000' },
  { name: 'Town Hall / Cinnamon Gardens (6.9147, 79.8650)', lat: '6.914700', lng: '79.865000' },
  { name: 'Colombo Fort Railway Station (6.9344, 79.8500)', lat: '6.934400', lng: '79.850000' },
  { name: 'Peliyagoda / Kelani Bridge (6.9600, 79.8800)', lat: '6.960000', lng: '79.880000' },
];

const HAZARD_CATEGORIES = [
  { value: 'Pothole', label: 'Pothole / Road Surface Crater', labelSi: 'වලවල් / මාර්ග මතුපිට හානි' },
  { value: 'DamagedRoad', label: 'Damaged Road / Shoulder Subsidence', labelSi: 'හානි වූ මාර්ගය / බැම්ම ගිලාබැසීම' },
  { value: 'WaterLeak', label: 'Water Leak / Burst Main Pipe', labelSi: 'ජල කාන්දුව / ප්‍රධාන නළය පිපිරීම' },
  { value: 'BrokenTrafficSignal', label: 'Broken Traffic Signal / Junction Lights', labelSi: 'අක්‍රිය මාර්ග සංඥා / මංසන්ධි විදුලි පහන්' },
  { value: 'FallenTree', label: 'Fallen Tree / Road Obstruction', labelSi: 'කඩා වැටුණු ගස් / මාර්ග බාධා' },
  { value: 'DrainageProblem', label: 'Drainage Problem / Monsoon Culvert Clog', labelSi: 'කානු ගැටළු / ජල කානු අවහිරතා' },
  { value: 'StreetLightProblem', label: 'Street Light Outage / Dark Corridor', labelSi: 'වීදි ලාම්පු අක්‍රිය වීම' },
  { value: 'Other', label: 'Other Municipal Hazard', labelSi: 'වෙනත් නාගරික උපද්‍රව' },
];

export const CitizenDashboard: React.FC = () => {
  const { isSinhala } = useLanguage();
  const user = authService.getCurrentUser();
  const [hazards, setHazards] = useState<HazardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTabFilter, setStatusTabFilter] = useState<'all' | 'active' | 'in_progress' | 'resolved' | 'cancelled'>('all');

  // ── CREATE Modal State ──────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [category, setCategory] = useState('Pothole');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<string>('6.927100');
  const [longitude, setLongitude] = useState<string>('79.861200');
  const [coordinatePaste, setCoordinatePaste] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [proximityZone, setProximityZone] = useState<string>('School Zone');
  const [submittedHazard, setSubmittedHazard] = useState<HazardDto | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── READ (Details) Modal State ──────────────────────────────────────────────
  const [detailsHazard, setDetailsHazard] = useState<HazardDto | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // ── UPDATE (Edit) Modal State ───────────────────────────────────────────────
  const [editingHazard, setEditingHazard] = useState<HazardDto | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
  const [editSelectedFiles, setEditSelectedFiles] = useState<File[]>([]);
  const [editPreviewUrls, setEditPreviewUrls] = useState<string[]>([]);
  const [editCoordinatePaste, setEditCoordinatePaste] = useState('');
  const [editDetectingLocation, setEditDetectingLocation] = useState(false);
  const [editLocationStatus, setEditLocationStatus] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // ── DELETE / CANCEL Modal State ─────────────────────────────────────────────
  const [deletingHazard, setDeletingHazard] = useState<HazardDto | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Lightbox State ──────────────────────────────────────────────────────────
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // ── Fetch Citizen's Hazard Reports ──────────────────────────────────────────
  const fetchMyHazards = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await apiClient.get<HazardDto[]>('/api/hazards/my');
      setHazards(res.data);
    } catch (err) {
      console.error('Failed to load citizen hazards:', err);
      setError(getErrorMessage(err));
      setHazards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyHazards();
  }, []);

  // ── Coordinate Helper Functions (Create) ───────────────────────────────────
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    setLocationStatus('Acquiring high-accuracy GPS fix from device sensors...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setDetectingLocation(false);
        setLocationStatus(`GPS Locked: ${lat}° N, ${lng}° E (Accuracy: ±${Math.round(position.coords.accuracy)}m)`);
      },
      (err) => {
        setDetectingLocation(false);
        setLocationStatus(`GPS detection failed: ${err.message}. You can enter coordinates manually below.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCoordinatePaste = (input: string) => {
    setCoordinatePaste(input);
    if (!input.trim()) return;

    const urlMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (urlMatch) {
      setLatitude(parseFloat(urlMatch[1]).toFixed(6));
      setLongitude(parseFloat(urlMatch[2]).toFixed(6));
      setLocationStatus(`Extracted coordinates from URL: ${urlMatch[1]}, ${urlMatch[2]}`);
      return;
    }

    const pairMatch = input.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
    if (pairMatch) {
      const lat = parseFloat(pairMatch[1]);
      const lng = parseFloat(pairMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        setLocationStatus(`Parsed coordinates: ${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`);
      }
    }
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = COLOMBO_HOTSPOTS.find((h) => h.name === e.target.value);
    if (selected && selected.lat && selected.lng) {
      setLatitude(selected.lat);
      setLongitude(selected.lng);
      setLocationStatus(`Location set to ${selected.name}`);
      if (!address) {
        setAddress(selected.name.split(' (')[0]);
      }
    }
  };

  // ── Coordinate Helper Functions (Edit) ─────────────────────────────────────
  const handleEditDetectLocation = () => {
    if (!navigator.geolocation) {
      setEditLocationStatus('Geolocation is not supported by your browser.');
      return;
    }
    setEditDetectingLocation(true);
    setEditLocationStatus('Acquiring high-accuracy GPS fix...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setEditLatitude(lat);
        setEditLongitude(lng);
        setEditDetectingLocation(false);
        setEditLocationStatus(`GPS Locked: ${lat}° N, ${lng}° E`);
      },
      (err) => {
        setEditDetectingLocation(false);
        setEditLocationStatus(`GPS detection failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleEditCoordinatePaste = (input: string) => {
    setEditCoordinatePaste(input);
    if (!input.trim()) return;

    const urlMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (urlMatch) {
      setEditLatitude(parseFloat(urlMatch[1]).toFixed(6));
      setEditLongitude(parseFloat(urlMatch[2]).toFixed(6));
      setEditLocationStatus(`Extracted coordinates: ${urlMatch[1]}, ${urlMatch[2]}`);
      return;
    }

    const pairMatch = input.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
    if (pairMatch) {
      const lat = parseFloat(pairMatch[1]);
      const lng = parseFloat(pairMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setEditLatitude(lat.toFixed(6));
        setEditLongitude(lng.toFixed(6));
        setEditLocationStatus(`Parsed coordinates: ${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`);
      }
    }
  };

  const handleEditPresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = COLOMBO_HOTSPOTS.find((h) => h.name === e.target.value);
    if (selected && selected.lat && selected.lng) {
      setEditLatitude(selected.lat);
      setEditLongitude(selected.lng);
      setEditLocationStatus(`Location set to ${selected.name}`);
      if (!editAddress) {
        setEditAddress(selected.name.split(' (')[0]);
      }
    }
  };

  // ── Image Handlers (Create) ─────────────────────────────────────────────────
  const resetCreateForm = () => {
    previewUrls.forEach((url) => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
    setDescription('');
    setAddress('');
    setCategory('Pothole');
    setLatitude('6.927100');
    setLongitude('79.861200');
    setCoordinatePaste('');
    setLocationStatus(null);
    setError(null);
    setSubmitSuccess(false);
    setSubmittedTicket(null);
    setSubmittedHazard(null);
    setProximityZone('School Zone');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const handleCloseCreate = () => {
    resetCreateForm();
    setShowCreateModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    addFilesToSelection(files);
    e.target.value = '';
  };

  const addFilesToSelection = (newFiles: File[]) => {
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    newFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return;
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...validPreviews]);
  };

  const removeSelectedFile = (index: number) => {
    if (previewUrls[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const addSamplePhoto = (label: string, color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`CIVITAGUARD AI • EVIDENCE`, 40, 60);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${label.toUpperCase()}`, 40, 110);
    ctx.font = '14px monospace';
    ctx.fillText(`COLOMBO MUNICIPAL DISPATCH`, 40, 150);
    ctx.fillText(`TIMESTAMP: ${new Date().toISOString()}`, 40, 180);
    ctx.fillText(`GPS: ${latitude}° N, ${longitude}° E`, 40, 210);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${label.toLowerCase().replace(/\s+/g, '_')}_evidence.jpg`, {
          type: 'image/jpeg',
        });
        addFilesToSelection([file]);
      }
    }, 'image/jpeg');
  };

  // ── Image Handlers (Edit) ───────────────────────────────────────────────────
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return;
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    });

    setEditSelectedFiles((prev) => [...prev, ...validFiles]);
    setEditPreviewUrls((prev) => [...prev, ...validPreviews]);
  };

  const removeEditSelectedFile = (index: number) => {
    URL.revokeObjectURL(editPreviewUrls[index]);
    setEditSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setEditPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeEditExistingImage = (index: number) => {
    setEditExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── C: Submit New Report (Create) ───────────────────────────────────────────
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a detailed description of the hazard.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let parsedLat: number | undefined;
      let parsedLng: number | undefined;
      if (latitude.trim() && longitude.trim()) {
        const latNum = parseFloat(latitude);
        const lngNum = parseFloat(longitude);
        if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
          parsedLat = latNum;
          parsedLng = lngNum;
        }
      }

      let finalImageUrl: string | null = null;
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        try {
          const uploadRes = await apiClient.post<{ imageUrl: string; imageUrls: string[] }>(
            '/api/hazards/upload-images',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          finalImageUrl = uploadRes.data.imageUrl;
        } catch {
          const singleFormData = new FormData();
          singleFormData.append('file', selectedFiles[0]);
          const singleRes = await apiClient.post<{ imageUrl: string }>(
            '/api/hazards/upload-image',
            singleFormData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          finalImageUrl = singleRes.data.imageUrl;
        }
      }

      const proximitySuffix = proximityZone ? ` (Proximity: ${proximityZone})` : '';
      const finalAddress = (address || 'Colombo Municipal Area') + proximitySuffix;

      const createRes = await apiClient.post<HazardDto>('/api/hazards', {
        category,
        description,
        address: finalAddress,
        latitude: parsedLat,
        longitude: parsedLng,
        imageUrl: finalImageUrl,
      });

      const createdData = createRes.data;
      if (createdData?.ticketNumber) setSubmittedTicket(createdData.ticketNumber);
      setSubmittedHazard(createdData);
      setSubmitSuccess(true);
      fetchMyHazards();

      previewUrls.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── U: Open & Submit Edit Report (Update) ────────────────────────────────────
  const handleOpenEdit = (h: HazardDto) => {
    setEditingHazard(h);
    setEditCategory(h.category || 'Pothole');
    setEditDescription(h.description || '');
    setEditAddress(h.address || '');
    setEditLatitude(h.latitude ? h.latitude.toString() : '');
    setEditLongitude(h.longitude ? h.longitude.toString() : '');
    setEditExistingImages(h.imageUrl ? h.imageUrl.split(',').filter(Boolean) : []);
    setEditSelectedFiles([]);
    setEditPreviewUrls([]);
    setEditCoordinatePaste('');
    setEditLocationStatus(null);
    setEditError(null);
    setEditSuccess(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHazard) return;

    if (!editDescription.trim()) {
      setEditError('Description cannot be empty.');
      return;
    }
    if (editDescription.trim().length < 10) {
      setEditError('Description must be at least 10 characters long.');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);

      let parsedLat: number | undefined;
      let parsedLng: number | undefined;
      if (editLatitude.trim() && editLongitude.trim()) {
        const latNum = parseFloat(editLatitude);
        const lngNum = parseFloat(editLongitude);
        if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
          parsedLat = latNum;
          parsedLng = lngNum;
        }
      }

      // Upload any newly selected files
      let uploadedUrls: string[] = [];
      if (editSelectedFiles.length > 0) {
        const formData = new FormData();
        editSelectedFiles.forEach((f) => formData.append('files', f));

        try {
          const uploadRes = await apiClient.post<{ imageUrl: string; imageUrls: string[] }>(
            '/api/hazards/upload-images',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          uploadedUrls = uploadRes.data.imageUrls || uploadRes.data.imageUrl.split(',');
        } catch {
          const singleFormData = new FormData();
          singleFormData.append('file', editSelectedFiles[0]);
          const singleRes = await apiClient.post<{ imageUrl: string }>(
            '/api/hazards/upload-image',
            singleFormData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          uploadedUrls = [singleRes.data.imageUrl];
        }
      }

      const finalImages = [...editExistingImages, ...uploadedUrls].filter(Boolean).join(',');

      await apiClient.put(`/api/hazards/${editingHazard.id}`, {
        category: editCategory,
        description: editDescription,
        address: editAddress,
        latitude: parsedLat,
        longitude: parsedLng,
        imageUrl: finalImages || undefined,
      });

      setEditSuccess(true);
      setTimeout(() => {
        setEditSuccess(false);
        setEditingHazard(null);
        fetchMyHazards();
      }, 1500);
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── D: Delete / Cancel Report (Delete) ───────────────────────────────────────
  const handleDeleteHazard = async (permanent: boolean) => {
    if (!deletingHazard) return;
    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      await apiClient.delete(`/api/hazards/${deletingHazard.id}?permanent=${permanent}`);
      setDeletingHazard(null);
      fetchMyHazards();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const copyCoordinates = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const isHazardEditable = (status: string) => {
    const s = status.toLowerCase();
    return s === 'submitted' || s === 'pendingaianalysis' || s === 'analysiscomplete' || s === 'underreview';
  };

  const isHazardCancellable = (status: string) => {
    const s = status.toLowerCase();
    return s !== 'inprogress' && s !== 'resolved' && s !== 'cancelled';
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pendingaianalysis':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'analysiscomplete':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'underreview':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'inprogress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-500 border-slate-300 line-through';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getSeverityBadge = (severity?: string) => {
    switch ((severity || '').toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'LOW':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    if (!isSinhala) return status;
    switch (status.toLowerCase()) {
      case 'submitted': return 'ඉදිරිපත් කළා';
      case 'pendingaianalysis': return 'AI විශ්ලේෂණය අපේක්ෂාවෙන්';
      case 'analysiscomplete': return 'විශ්ලේෂණය සම්පූර්ණයි';
      case 'underreview': return 'සමාලෝචනය වෙමින්';
      case 'inprogress': return 'ක්‍රියාත්මක වෙමින්';
      case 'resolved': return 'විසඳන ලදි';
      case 'cancelled': return 'අවලංගු කළා';
      default: return status;
    }
  };

  const getCategoryText = (cat: string) => {
    if (!isSinhala) return cat;
    const found = HAZARD_CATEGORIES.find((c) => c.value.toLowerCase() === (cat || '').toLowerCase());
    return found?.labelSi || cat;
  };

  // ── Filtered Hazards List ──────────────────────────────────────────────────
  const filteredHazards = hazards.filter((h) => {
    // Status tab filter
    if (statusTabFilter === 'active') {
      const s = h.status.toLowerCase();
      if (s === 'resolved' || s === 'cancelled') return false;
    } else if (statusTabFilter === 'in_progress') {
      if (h.status.toLowerCase() !== 'inprogress') return false;
    } else if (statusTabFilter === 'resolved') {
      if (h.status.toLowerCase() !== 'resolved') return false;
    } else if (statusTabFilter === 'cancelled') {
      if (h.status.toLowerCase() !== 'cancelled') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTicket = h.ticketNumber?.toLowerCase().includes(q);
      const matchCat = h.category?.toLowerCase().includes(q);
      const matchDesc = h.description?.toLowerCase().includes(q);
      const matchAddr = h.address?.toLowerCase().includes(q);
      const matchStatus = h.status?.toLowerCase().includes(q);
      return matchTicket || matchCat || matchDesc || matchAddr || matchStatus;
    }

    return true;
  });

  // ── Stats calculation ──────────────────────────────────────────────────────
  const totalCount = hazards.length;
  const underReviewCount = hazards.filter(
    (h) => h.status === 'Submitted' || h.status === 'PendingAIAnalysis' || h.status === 'UnderReview'
  ).length;
  const inProgressCount = hazards.filter((h) => h.status === 'InProgress').length;
  const resolvedCount = hazards.filter((h) => h.status === 'Resolved').length;

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-cyan-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-cyan-200">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isSinhala ? 'පුරවැසි යටිතල පහසුකම් අංශය • කොළඹ මහ නගර සභාව' : 'CITIZEN INFRASTRUCTURE DESK • COLOMBO MUNICIPALITY'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isSinhala ? `ආයුබෝවන්, ${user?.fullName || 'පුරවැසියනි'}` : `Welcome, ${user?.fullName || 'Citizen'}`}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isSinhala
              ? 'විනාශ වූ යටිතල පහසුකම්, වලවල්, හානි වූ සංඥා පුවරු සහ ජල කාන්දුවීම් වාර්තා කරන්න. CivitaGuard AI මඟින් වාර්තා වර්ගීකරණය කර ක්ෂේත්‍ර අලුත්වැඩියා කණ්ඩායම් සම්බන්ධීකරණය කරයි.'
              : 'Report broken infrastructure, potholes, damaged signals, and water leaks. CivitaGuard AI triages reports with computer vision and coordinates field repair crews with transparent updates.'}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-cyan-500/25 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSinhala ? 'නව උපද්‍රවයක් වාර්තා කරන්න' : 'Report New Hazard'}</span>
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors border border-white/10"
            >
              <MapPin className="w-4 h-4 text-cyan-300" />
              <span>{isSinhala ? 'නාගරික GIS සිතියම බලන්න' : 'View City GIS Map'}</span>
            </Link>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors border border-white/10"
            >
              <span>{isSinhala ? 'ආරක්ෂණ විශ්ලේෂණ බලන්න' : 'View Safety Analytics'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Metric Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isSinhala ? 'මගේ ඉදිරිපත් කිරීම්' : 'My Submissions'}
            </span>
            <AlertTriangle className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
          <p className="text-[11px] text-slate-500">
            {isSinhala ? 'ඔබ විසින් වාර්තා කරන ලද උපද්‍රව' : 'Total hazards logged by you'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isSinhala ? 'සමාලෝචනය වෙමින්' : 'Under Review'}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{underReviewCount}</div>
          <p className="text-[11px] text-slate-500">
            {isSinhala ? 'AI වර්ගීකරණය සහ නාගරික තහවුරු කිරීම' : 'AI triage & municipal verification'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isSinhala ? 'ක්ෂේත්‍ර අලුත්වැඩියාව' : 'Field Repair'}
            </span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{inProgressCount}</div>
          <p className="text-[11px] text-slate-500">
            {isSinhala ? 'කණ්ඩායම අලුත්වැඩියා කරමින් සිටී' : 'Assigned crew actively fixing'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isSinhala ? 'විසඳන ලද' : 'Resolved'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{resolvedCount}</div>
          <p className="text-[11px] text-slate-500">
            {isSinhala ? 'අවසන් කර අධීක්ෂක විසින් තහවුරු කළ' : 'Completed and supervisor verified'}
          </p>
        </div>
      </div>

      {/* ── My Reported Hazards Table & Management Desk ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isSinhala ? 'මගේ උපද්‍රව වාර්තා' : 'My Hazard Reports'}
              </h2>
              <p className="text-xs text-slate-500">
                {isSinhala
                  ? 'ඔබගේ ගිණුමෙන් ඉදිරිපත් කරන ලද නාගරික යටිතල පහසුකම් උපද්‍රව බලන්න, යාවත්කාලීන කරන්න හෝ අවලංගු කරන්න.'
                  : 'View, update, or cancel municipal infrastructure hazards submitted from your account.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchMyHazards(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                title={isSinhala ? 'වගු වාර්තා නැවුම් කරන්න' : 'Refresh table records'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-600' : ''}`} />
                <span>{refreshing ? (isSinhala ? 'නැවුම් වෙමින්...' : 'Refreshing...') : (isSinhala ? 'නැවුම් කරන්න' : 'Refresh')}</span>
              </button>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isSinhala ? 'උපද්‍රවයක් වාර්තා කරන්න' : 'Report Hazard'}</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                { key: 'all', label: isSinhala ? 'සියලු වාර්තා' : 'All Reports', count: hazards.length },
                { key: 'active', label: isSinhala ? 'සක්‍රීය' : 'Active', count: hazards.filter((h) => h.status !== 'Resolved' && h.status !== 'Cancelled').length },
                { key: 'in_progress', label: isSinhala ? 'ක්‍රියාත්මක වෙමින්' : 'In Progress', count: inProgressCount },
                { key: 'resolved', label: isSinhala ? 'විසඳන ලද' : 'Resolved', count: resolvedCount },
                { key: 'cancelled', label: isSinhala ? 'අවලංගු කළ' : 'Cancelled', count: hazards.filter((h) => h.status === 'Cancelled').length },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusTabFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusTabFilter === tab.key
                      ? 'bg-cyan-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusTabFilter === tab.key ? 'bg-white/20' : 'bg-white text-slate-600'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={isSinhala ? 'ප්‍රවේශපත්‍රය, වර්ගය, වීදිය සොයන්න...' : 'Search ticket, category, street...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
            <span>{isSinhala ? 'නාගරික උපද්‍රව වාර්තා සමඟ සම්බන්ධ වෙමින්...' : 'Connecting to municipal hazard records...'}</span>
          </div>
        ) : filteredHazards.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {hazards.length === 0
                ? (isSinhala ? 'තවම කිසිදු උපද්‍රවයක් වාර්තා කර නැත' : 'No Reported Hazards Yet')
                : (isSinhala ? 'ගැලපෙන උපද්‍රව වාර්තා හමු නොවීය' : 'No Matching Hazard Reports')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hazards.length === 0
                ? (isSinhala
                    ? 'වලක්, කැඩුණු වීදි ලාම්පුවක් හෝ ජල නළ කාන්දුවක් දුටු විට, නාගරික කණ්ඩායම් වෙත ක්ෂණිකව යැවීමට මෙහි වාර්තා කරන්න!'
                    : 'When you notice a pothole, broken streetlight, or burst pipe, report it here for prompt municipal dispatch!')
                : (isSinhala
                    ? 'ඔබගේ සෙවුමට ගැලපෙන වාර්තා නොමැත. සෙවුම් පෙරහන් ඉවත් කර නැවත බලන්න.'
                    : 'No reports match your current filter or search keyword. Try clearing search filters.')}
            </p>
            {hazards.length === 0 && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isSinhala ? 'පළමු වාර්තාව ඉදිරිපත් කරන්න' : 'Submit First Report'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">{isSinhala ? 'ප්‍රවේශපත්‍ර අංකය' : 'Ticket #'}</th>
                  <th className="px-5 py-3">{isSinhala ? 'වර්ගය සහ බරපතලකම' : 'Category & Severity'}</th>
                  <th className="px-5 py-3">{isSinhala ? 'විස්තරය සහ ස්ථානය' : 'Description & Location'}</th>
                  <th className="px-5 py-3">{isSinhala ? 'වාර්තා කළ දිනය' : 'Reported Date'}</th>
                  <th className="px-5 py-3">{isSinhala ? 'තත්ත්වය' : 'Status'}</th>
                  <th className="px-5 py-3 text-right">{isSinhala ? 'ක්‍රියාමාර්ග' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHazards.map((h) => {
                  const editable = isHazardEditable(h.status);
                  const cancellable = isHazardCancellable(h.status);

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Ticket # */}
                      <td className="px-5 py-3.5 font-mono font-bold text-cyan-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{h.ticketNumber || 'CG-PENDING'}</span>
                        </div>
                      </td>

                      {/* Category & Severity */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{getCategoryText(h.category)}</div>
                        {h.severity && (
                          <span
                            className={`mt-1 inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase border ${getSeverityBadge(
                              h.severity
                            )}`}
                          >
                            {h.severity} {isSinhala ? 'බරපතලකම' : ''}
                          </span>
                        )}
                      </td>

                      {/* Description & Location */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="truncate font-medium text-slate-800">{h.description}</div>
                        {h.address && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{h.address}</span>
                          </div>
                        )}
                        {h.latitude && h.longitude && (
                          <div className="text-[10px] font-mono text-cyan-700 flex items-center gap-1.5 mt-1 flex-wrap">
                            <Navigation className="w-2.5 h-2.5 text-cyan-600 shrink-0" />
                            <span>
                              {h.latitude.toFixed(4)}° N, {h.longitude.toFixed(4)}° E
                            </span>
                            <Link
                              to={`/dashboard?focus=${h.ticketNumber}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-sans font-bold text-[10px] transition-colors shadow-2xs"
                              title={isSinhala ? 'මෙම වාර්තාව නාගරික GIS සිතියමේ බලන්න' : 'View this report pinned on City GIS Map'}
                            >
                              <MapPin className="w-2.5 h-2.5 text-cyan-700" />
                              <span>{isSinhala ? 'සිතියමේ බලන්න' : 'View on Map'}</span>
                            </Link>
                          </div>
                        )}

                        {/* Attached Photos */}
                        {h.imageUrl && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {h.imageUrl.split(',').filter(Boolean).map((imgUrl, i) => {
                              const cleanImg = imgUrl.trim();
                              const backendBase = import.meta.env.VITE_API_URL || 'https://civilanka-a3gqebh7h4f0f6gy.indiasouthcentral-01.azurewebsites.net';
                              const resolvedUrl = cleanImg.startsWith('http')
                                ? cleanImg
                                : `${backendBase.replace(/\/$/, '')}${cleanImg.startsWith('/') ? cleanImg : `/${cleanImg}`}`;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setActiveLightboxImage(resolvedUrl)}
                                  className="relative group w-8 h-8 rounded-md overflow-hidden border border-slate-200 hover:border-cyan-500 transition-all shrink-0 shadow-2xs cursor-pointer"
                                  title="Click to view full photo evidence"
                                >
                                  <img
                                    src={resolvedUrl}
                                    alt="Evidence"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="w-3 h-3 text-white" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Reported Date */}
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(h.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            h.status
                          )}`}
                        >
                          {getStatusText(h.status)}
                        </span>
                      </td>

                      {/* CRUD Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* 1. View Details (Read) */}
                          <button
                            type="button"
                            onClick={() => setDetailsHazard(h)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                            title={isSinhala ? 'සම්පූර්ණ වාර්තා විස්තර සහ AI වර්ගීකරණය බලන්න' : 'View Full Report Details & AI Triage'}
                          >
                            <Eye className="w-3 h-3 text-slate-600" />
                            <span>{isSinhala ? 'විස්තර' : 'Details'}</span>
                          </button>

                          {/* 2. Edit (Update) */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(h)}
                            disabled={!editable}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              editable
                                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 cursor-pointer'
                                : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                            }`}
                            title={editable ? (isSinhala ? 'වාර්තාව සංස්කරණය කරන්න' : 'Edit Report') : (isSinhala ? 'සංස්කරණය කළ නොහැක' : 'Locked from editing')}
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{isSinhala ? 'සංස්කරණය' : 'Edit'}</span>
                          </button>

                          {/* 3. Delete / Cancel (Delete) */}
                          <button
                            type="button"
                            onClick={() => setDeletingHazard(h)}
                            disabled={!cancellable}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              cancellable
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 cursor-pointer'
                                : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                            }`}
                            title={cancellable ? (isSinhala ? 'වාර්තාව අවලංගු කරන්න හෝ ඉවත් කරන්න' : 'Cancel or Delete Report') : (isSinhala ? 'දැනටමත් ක්‍රියාත්මකයි' : 'Already in progress')}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isSinhala ? 'අවලංගු' : 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Public Helpline Card ───────────────────────────────────────────── */}
      <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-cyan-700 shadow-2xs">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              {isSinhala ? 'හදිසි අනතුරු / ජීවිතයට තර්ජනයක් වන මාර්ග උපද්‍රව?' : 'Immediate Emergency / Life-Threatening Road Hazards?'}
            </h4>
            <p className="text-[11px] text-slate-500">
              {isSinhala
                ? 'කඩා වැටුණු පාලම්, සජීවී විදුලි රැහැන් හෝ විශාල ගෑස් කාන්දුවීම් සඳහා කොළඹ ආපදා ප්‍රතිචාර අංශය අමතන්න.'
                : 'For collapsed bridges, live exposed powerlines, or major gas leaks, contact Colombo Municipal Disaster Response.'}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono font-bold text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-200">
          {isSinhala ? 'හදිසි ඇමතුම් අංකය:' : 'Emergency Hotline:'} <span className="text-cyan-700">1990 / 011-2691111</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: REPORT NEW HAZARD (CREATE)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isSinhala ? 'නාගරික උපද්‍රවයක් වාර්තා කරන්න' : 'Report Municipal Hazard'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-cyan-800 font-semibold">
                      {isSinhala ? 'ක්ෂණික AI වර්ගීකරණය ක්‍රියාත්මකයි (gemini-3.8-flash)' : 'Instant AI Triage Enabled (gemini-3.8-flash)'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseCreate}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
                title={isSinhala ? 'වසන්න' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content: Either Instant AI Triage Certificate OR Form */}
            {submitSuccess && submittedHazard ? (
              <div className="p-6 space-y-5 animate-in fade-in max-h-[80vh] overflow-y-auto">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border border-emerald-200 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">
                          {isSinhala ? 'වාර්තාව ලියාපදිංචි කර ක්ෂණිකව AI වර්ගීකරණය කරන ලදි' : 'Report Registered & AI Triaged Instantly'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            {submittedTicket || submittedHazard.ticketNumber}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {isSinhala ? 'ප්‍රමාදයකින් තොර පද්ධතිය' : 'Zero-Delay Pipeline'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                      {isSinhala ? 'විශ්ලේෂණය අවසන්' : 'Analysis Complete'}
                    </span>
                  </div>

                  {/* AI Output Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        {isSinhala ? 'වර්ගීකරණය කළ උපද්‍රවය' : 'Classified Hazard'}
                      </span>
                      <div className="text-xs font-black text-slate-900 truncate">
                        {getCategoryText(submittedHazard.category)}
                      </div>
                      {category === 'Other' && (
                        <span className="text-[9px] text-cyan-700 font-semibold block">
                          {isSinhala ? '● "වෙනත්" වෙතින් නැවත වර්ගීකරණය කරන ලදි' : '● Reclassified from "Other"'}
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        {isSinhala ? 'සහතික කළ බරපතලකම' : 'Certified Severity'}
                      </span>
                      <div
                        className={`text-xs font-black uppercase ${
                          submittedHazard.severity === 'CRITICAL'
                            ? 'text-rose-600'
                            : submittedHazard.severity === 'HIGH'
                            ? 'text-amber-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {submittedHazard.severity || 'MEDIUM'}
                      </div>
                      <span className="text-[9px] text-slate-500 block">
                        {isSinhala ? 'ප්‍රමුඛතාව:' : 'Priority:'} {submittedHazard.priority}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        {isSinhala ? 'විසඳුම් කාලරාමුව (SLA)' : 'Resolution SLA'}
                      </span>
                      <div className="text-xs font-black text-purple-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-600" />
                        <span>
                          {submittedHazard.severity === 'CRITICAL'
                            ? (isSinhala ? 'පැය 4' : '4 Hours')
                            : submittedHazard.severity === 'HIGH'
                            ? (isSinhala ? 'පැය 12' : '12 Hours')
                            : (isSinhala ? 'පැය 24-48' : '24-48 Hours')}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 block">
                        {isSinhala ? 'ක්ෂණික වර්ගීකරණය' : 'Immediate Triage'}
                      </span>
                    </div>
                  </div>

                  {/* AI Reasoning */}
                  {submittedHazard.latestAIAnalysis?.reason && (
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-600" />
                        {isSinhala ? 'AI තාර්කික පදනම සහ අවදානම් සාධාරණීකරණය:' : 'AI Reasoning & Risk Justification:'}
                      </span>
                      <p className="text-[11px] text-slate-700 leading-relaxed italic">
                        &ldquo;{submittedHazard.latestAIAnalysis.reason}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <Link
                      to={`/dashboard?focus=${submittedHazard.ticketNumber}`}
                      className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isSinhala ? 'GIS සිතියමෙන් සජීවීව බලන්න →' : 'View Live Pin on GIS Map →'}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleCloseCreate}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 text-xs transition-colors cursor-pointer"
                    >
                      {isSinhala ? 'මගේ වාර්තා වෙත ආපසු' : 'Back to My Reports'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                    {error}
                  </div>
                )}

                {/* Section 1: Category */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-600" />
                      <span>{isSinhala ? 'උපද්‍රව වර්ගය' : 'Hazard Category'}</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {isSinhala ? 'හොඳින් ගැළපෙන වර්ගය හෝ "වෙනත්" තෝරන්න' : 'Select best fit or "Other"'}
                    </span>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {HAZARD_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {isSinhala ? cat.labelSi : cat.label}
                      </option>
                    ))}
                  </select>

                  {category === 'Other' && (
                    <div className="p-2.5 mt-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>{isSinhala ? 'Zero-Shot AI හඳුනාගැනීම:' : 'Zero-Shot AI Detection:'}</strong>{' '}
                        {isSinhala
                          ? 'ඔබ "වෙනත්" තෝරාගත් විට, AI නියෝජිතයා ඔබගේ විස්තරය සහ ඡායාරූප සාක්ෂි විශ්ලේෂණය කර නියමිත උපද්‍රව වර්ගය ස්වයංක්‍රීයව හඳුනාගෙන අවශ්‍ය නම් බරපතලකම වැඩි කරයි.'
                          : 'When you select "Other", the AI agent analyzes your narrative and evidence photos to automatically deduce the true hazard type and escalate severity if needed.'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Proximity Risk Environment */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                      <span>{isSinhala ? 'ආසන්න අවදානම් පරිසරය' : 'Proximity Risk Environment'}</span>
                    </label>
                    <span className="text-[10px] font-semibold text-cyan-700">
                      {isSinhala ? 'නාගරික අවදානම් ගුණකය' : 'Urban Risk Multipliers'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { label: isSinhala ? 'පාසල් කලාපය' : 'School Zone', value: 'School Zone', icon: School },
                      { label: isSinhala ? 'රෝහල / සායනය' : 'Hospital / Clinic', value: 'Hospital / Clinic', icon: Hospital },
                      { label: isSinhala ? 'ප්‍රධාන අධිවේගී මාර්ගය' : 'Primary Highway', value: 'Primary Highway', icon: Compass },
                      { label: isSinhala ? 'පදික වේදිකාව' : 'Pedestrian Walkway', value: 'Pedestrian Walkway', icon: Users },
                      { label: isSinhala ? 'වාණිජ කලාපය' : 'Commercial Hub', value: 'Commercial Hub', icon: Building2 },
                      { label: isSinhala ? 'නේවාසික ප්‍රදේශය' : 'Residential Area', value: 'Residential Area', icon: Compass },
                    ].map((zone) => {
                      const Icon = zone.icon;
                      const isActive = proximityZone === zone.value;
                      return (
                        <button
                          key={zone.value}
                          type="button"
                          onClick={() => setProximityZone(zone.value)}
                          className={`flex items-center gap-1.5 p-2 rounded-xl text-[11px] font-semibold border transition-all text-left cursor-pointer ${
                            isActive
                              ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-cyan-600'}`} />
                          <span className="truncate">{zone.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      {isSinhala ? 'විස්තරය' : 'Description'} <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      English &bull; සිංහල &bull; தமிழ் ({description.length} {isSinhala ? 'අකුරු' : 'chars'})
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      isSinhala
                        ? 'නිශ්චිත තොරතුරු සපයන්න: ප්‍රමාණය, ජල පීඩනය, මාර්ග හානියේ ගැඹුර, පදිකයන්ට හෝ පාසල් සිසුන්ට ඇති අනතුර...'
                        : 'Provide details: size, water pressure, road damage depth, danger to pedestrians or schoolchildren...'
                    }
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed"
                  />
                </div>

                {/* Section 4: Street Address / Landmark */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isSinhala ? 'වීදියේ ලිපිනය හෝ ආසන්න සලකුණ' : 'Street Address or Landmark'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={
                      isSinhala
                        ? 'උදා: රාජකීය මාවත, රාජකීය විද්‍යාලය අසල, කොළඹ 07'
                        : 'e.g. Rajakeeya Mawatha near Royal College, Colombo 07'
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Section 5: Photographic Evidence Upload */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Camera className="w-4 h-4 text-cyan-600" />
                      <span>{isSinhala ? 'ඡායාරූප සාක්ෂි' : 'Photographic Evidence'}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {isSinhala ? 'උපරිම 10MB බැගින්' : 'Max 10MB each'}
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) addFilesToSelection(Array.from(e.dataTransfer.files));
                    }}
                    className="border-2 border-dashed border-slate-300 hover:border-cyan-500 bg-white rounded-xl p-4 text-center cursor-pointer transition-colors"
                  >
                    <UploadCloud className="w-6 h-6 text-cyan-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-700">
                      {isSinhala ? 'ඡායාරූප මෙතැනට ඇද දමන්න හෝ බ්‍රවුස් කිරීමට ක්ලික් කරන්න' : 'Drag & drop photos or click to browse'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isSinhala ? 'කැමරාව සහ ගැලරිය සඳහා සහය දක්වයි' : 'Camera capture & gallery supported'}
                    </p>
                  </div>

                  {previewUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                          <img src={url} alt={`Evidence #${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(idx)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-red-600 text-white shadow-md opacity-90 hover:opacity-100 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {isSinhala ? 'පරීක්ෂණ සාම්පල:' : 'Presets:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => addSamplePhoto('Pothole Asphalt Damage', '#334155')}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                    >
                      {isSinhala ? '+ වලවල් ඡායාරූපය' : '+ Pothole Photo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => addSamplePhoto('Water Main Pipe Burst', '#0284c7')}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                    >
                      {isSinhala ? '+ ජල කාන්දු ඡායාරූපය' : '+ Water Burst Photo'}
                    </button>
                  </div>
                </div>

                {/* Section 6: Geodetic Location */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Compass className="w-4 h-4 text-cyan-600" />
                      <span>{isSinhala ? 'GIS භූගෝලීය ඛණ්ඩාංක' : 'GIS Geodetic Coordinates'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detectingLocation}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                    >
                      {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                      <span>
                        {detectingLocation
                          ? (isSinhala ? 'ස්ථානය සොයමින්...' : 'Locating...')
                          : (isSinhala ? 'ස්වයංක්‍රීය GPS' : 'Auto-Detect GPS')}
                      </span>
                    </button>
                  </div>

                  <select
                    onChange={handlePresetSelect}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-medium"
                  >
                    {COLOMBO_HOTSPOTS.map((h, i) => (
                      <option key={i} value={h.name}>
                        {h.name}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        {isSinhala ? 'අක්ෂාංශය (°N)' : 'Latitude (°N)'}
                      </label>
                      <input
                        type="text"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="6.927100"
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        {isSinhala ? 'දේශාංශය (°E)' : 'Longitude (°E)'}
                      </label>
                      <input
                        type="text"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="79.861200"
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    value={coordinatePaste}
                    onChange={(e) => handleCoordinatePaste(e.target.value)}
                    placeholder={
                      isSinhala
                        ? 'Google Maps සබැඳිය හෝ lat, lng මෙහි අලවන්න...'
                        : 'Paste Google Maps URL or lat, lng...'
                    }
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-xs font-mono"
                  />

                  {locationStatus && (
                    <p className="text-[10px] text-cyan-800 font-medium">{locationStatus}</p>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseCreate}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50 text-xs"
                  >
                    {isSinhala ? 'අවලංගු කරන්න' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        <span>{isSinhala ? 'AI මඟින් විශ්ලේෂණය කර ඉදිරිපත් කරමින්...' : 'Analyzing with AI & Submitting...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isSinhala ? 'ඉදිරිපත් කර ක්ෂණික AI වර්ගීකරණය ධාවනය කරන්න' : 'Submit & Run Instant AI Triage'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: VIEW HAZARD DETAILS (READ)
      ═══════════════════════════════════════════════════════════════════════ */}
      {detailsHazard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="font-mono text-xs font-bold text-cyan-200">{detailsHazard.ticketNumber}</div>
                  <h3 className="text-sm font-bold text-white">{detailsHazard.category}</h3>
                </div>
              </div>
              <button
                onClick={() => setDetailsHazard(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(detailsHazard.status)}`}>
                  {isSinhala ? 'තත්ත්වය:' : 'Status:'} {getStatusText(detailsHazard.status)}
                </span>
                {detailsHazard.severity && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getSeverityBadge(detailsHazard.severity)}`}>
                    {detailsHazard.severity} {isSinhala ? 'බරපතලකම' : 'Severity'}
                  </span>
                )}
                {detailsHazard.priority && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {isSinhala ? 'ප්‍රමුඛතාව:' : 'Priority:'} {detailsHazard.priority}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isSinhala ? 'විස්තරය' : 'Description'}
                </label>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                  {detailsHazard.description}
                </p>
              </div>

              {/* Location & GPS */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                    <span>{isSinhala ? 'ස්ථාන තොරතුරු' : 'Location Details'}</span>
                  </span>
                  {detailsHazard.latitude && detailsHazard.longitude && (
                    <Link
                      to={`/dashboard?focus=${detailsHazard.ticketNumber}`}
                      className="text-cyan-700 hover:text-cyan-800 font-bold inline-flex items-center gap-1"
                    >
                      <span>{isSinhala ? 'GIS සිතියම වෙත යන්න →' : 'Focus on GIS Map →'}</span>
                    </Link>
                  )}
                </div>

                {detailsHazard.address && (
                  <p className="text-slate-700 font-medium">{detailsHazard.address}</p>
                )}

                {detailsHazard.latitude && detailsHazard.longitude && (
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                    <span>
                      {detailsHazard.latitude.toFixed(6)}° N, {detailsHazard.longitude.toFixed(6)}° E
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCoordinates(detailsHazard.latitude!, detailsHazard.longitude!)}
                      className="text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 font-sans text-[11px]"
                      title="Copy coordinates"
                    >
                      {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCoords ? (isSinhala ? 'පිටපත් කළා' : 'Copied') : (isSinhala ? 'පිටපත් කරන්න' : 'Copy')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Photographic Evidence Gallery */}
              {detailsHazard.imageUrl && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Camera className="w-3 h-3 text-cyan-600" />
                    <span>{isSinhala ? `අමුණා ඇති ඡායාරූප (${detailsHazard.imageUrl.split(',').filter(Boolean).length})` : `Attached Photos (${detailsHazard.imageUrl.split(',').filter(Boolean).length})`}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {detailsHazard.imageUrl.split(',').filter(Boolean).map((imgUrl, i) => {
                      const cleanImg = imgUrl.trim();
                      const backendBase = import.meta.env.VITE_API_URL || 'https://civilanka-a3gqebh7h4f0f6gy.indiasouthcentral-01.azurewebsites.net';
                      const resolvedUrl = cleanImg.startsWith('http')
                        ? cleanImg
                        : `${backendBase.replace(/\/$/, '')}${cleanImg.startsWith('/') ? cleanImg : `/${cleanImg}`}`;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveLightboxImage(resolvedUrl)}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 shadow-2xs hover:border-cyan-500 transition-all cursor-zoom-in"
                        >
                          <img src={resolvedUrl} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Triage Analysis Details */}
              {detailsHazard.latestAIAnalysis && (
                <div className="p-3.5 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-cyan-900">
                      <Sparkles className="w-4 h-4 text-cyan-600" />
                      <span>{isSinhala ? 'CivitaGuard AI පරිගණක දෘශ්‍ය විශ්ලේෂණය' : 'CivitaGuard AI Computer Vision Triage'}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-cyan-800 border border-cyan-200">
                      {(detailsHazard.latestAIAnalysis.confidence * 100).toFixed(0)}% {isSinhala ? 'විශ්වාසනීයත්වය' : 'Confidence'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {detailsHazard.latestAIAnalysis.reason}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500 font-mono">
                    <span>{isSinhala ? 'මාදිලිය:' : 'Model:'} {detailsHazard.latestAIAnalysis.modelName}</span>
                    <span>&bull;</span>
                    <span>{isSinhala ? 'අවදානම:' : 'Risk:'} {detailsHazard.latestAIAnalysis.riskLevel}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                {isSinhala ? 'ලියාපදිංචි කළ දිනය:' : 'Logged on'} {new Date(detailsHazard.createdAt).toLocaleString(isSinhala ? 'si-LK' : undefined)}
              </div>
              <div className="flex items-center gap-2">
                {isHazardEditable(detailsHazard.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      const h = detailsHazard;
                      setDetailsHazard(null);
                      handleOpenEdit(h);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isSinhala ? 'වාර්තාව සංස්කරණය' : 'Edit Report'}</span>
                  </button>
                )}
                {isHazardCancellable(detailsHazard.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      const h = detailsHazard;
                      setDetailsHazard(null);
                      setDeletingHazard(h);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isSinhala ? 'මකන්න / අවලංගු කරන්න' : 'Delete / Cancel'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailsHazard(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  {isSinhala ? 'වසන්න' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: EDIT HAZARD REPORT (UPDATE)
      ═══════════════════════════════════════════════════════════════════════ */}
      {editingHazard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{isSinhala ? 'අනතුරු වාර්තාව සංස්කරණය කරන්න' : 'Edit Hazard Report'}</h3>
                  <p className="text-[11px] font-mono text-cyan-800 font-bold">{editingHazard.ticketNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingHazard(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {editSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isSinhala ? 'අනතුරු වාර්තාව සාර්ථකව යාවත්කාලීන කරන ලදී! නගර සභා වාර්තා යාවත්කාලීන වෙමින් පවතී...' : 'Hazard report updated successfully! Updating municipal dispatch records...'}</span>
                </div>
              )}

              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isSinhala ? 'අනතුරු වර්ගය' : 'Hazard Category'}</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                >
                  {HAZARD_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {isSinhala ? (cat.labelSi || cat.label) : cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isSinhala ? 'විස්තරය' : 'Description'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={isSinhala ? 'අනතුර පිළිබඳ සවිස්තරාත්මක විස්තරයක්...' : 'Detailed description of the hazard...'}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isSinhala ? 'ලිපිනය හෝ ආසන්න සලකුණ' : 'Street Address or Landmark'}</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder={isSinhala ? 'උදා: කොල්ලුපිටිය හන්දිය අසල ගාලු පාර' : 'e.g. Galle Road near Kollupitiya Junction'}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                />
              </div>

              {/* Photos Manager */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Camera className="w-4 h-4 text-cyan-600" />
                    <span>{isSinhala ? 'අමුණා ඇති ඡායාරූප කළමනාකරණය' : 'Manage Attached Photos'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="text-cyan-700 hover:text-cyan-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isSinhala ? '+ ඡායාරූප එක් කරන්න' : '+ Add Photos'}</span>
                  </button>
                </div>

                <input
                  ref={editFileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleEditFileChange}
                  className="hidden"
                />

                {/* Existing Images */}
                {editExistingImages.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">{isSinhala ? 'වත්මන් ඡායාරූප:' : 'Current Photos:'}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {editExistingImages.map((imgUrl, i) => {
                        const cleanImg = imgUrl.trim();
                        const backendBase = import.meta.env.VITE_API_URL || 'https://civilanka-a3gqebh7h4f0f6gy.indiasouthcentral-01.azurewebsites.net';
                        const resolvedUrl = cleanImg.startsWith('http')
                          ? cleanImg
                          : `${backendBase.replace(/\/$/, '')}${cleanImg.startsWith('/') ? cleanImg : `/${cleanImg}`}`;
                        return (
                          <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                            <img src={resolvedUrl} alt="Existing" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeEditExistingImage(i)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-red-600 text-white shadow-md opacity-90 hover:opacity-100"
                              title="Remove this photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Newly Added Files */}
                {editPreviewUrls.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] uppercase font-bold text-cyan-700">{isSinhala ? 'උඩුගත කිරීමට නව ඡායාරූප:' : 'New Photos to Upload:'}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {editPreviewUrls.map((url, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-cyan-300 aspect-video bg-slate-100">
                          <img src={url} alt="New preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeEditSelectedFile(idx)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-red-600 text-white shadow-md cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* GIS Coordinates */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Compass className="w-4 h-4 text-cyan-600" />
                    <span>{isSinhala ? 'ඛණ්ඩාංක (Coordinates)' : 'Coordinates'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleEditDetectLocation}
                    disabled={editDetectingLocation}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                  >
                    {editDetectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                    <span>{editDetectingLocation ? (isSinhala ? 'ස්ථානය සොයමින්...' : 'Locating...') : (isSinhala ? 'GPS ස්වයංක්‍රීයව හඳුනාගන්න' : 'Auto-Detect GPS')}</span>
                  </button>
                </div>

                <select
                  onChange={handleEditPresetSelect}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium"
                >
                  {COLOMBO_HOTSPOTS.map((h, i) => (
                    <option key={i} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">{isSinhala ? 'අක්ෂාංශ (Latitude)' : 'Latitude'}</label>
                    <input
                      type="text"
                      value={editLatitude}
                      onChange={(e) => setEditLatitude(e.target.value)}
                      placeholder="6.927100"
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">{isSinhala ? 'දේශාංශ (Longitude)' : 'Longitude'}</label>
                    <input
                      type="text"
                      value={editLongitude}
                      onChange={(e) => setEditLongitude(e.target.value)}
                      placeholder="79.861200"
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  value={editCoordinatePaste}
                  onChange={(e) => handleEditCoordinatePaste(e.target.value)}
                  placeholder={isSinhala ? 'Google Maps සබැඳිය හෝ lat, lng මෙහි අලවන්න...' : 'Paste Google Maps URL or lat, lng...'}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-[11px]"
                />

                {editLocationStatus && (
                  <p className="text-[10px] text-cyan-800 font-medium">{editLocationStatus}</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingHazard(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  {isSinhala ? 'අවලංගු කරන්න' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || editSuccess}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isSinhala ? 'වෙනස්කම් සුරකිමින්...' : 'Saving Changes...'}</span>
                    </>
                  ) : (
                    <span>{isSinhala ? 'වෙනස්කම් සුරකින්න' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: DELETE / CANCEL CONFIRMATION (DELETE)
      ═══════════════════════════════════════════════════════════════════════ */}
      {deletingHazard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-5 bg-red-50 border-b border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{isSinhala ? 'වාර්තාව අවලංගු කිරීම හෝ මැකීම?' : 'Cancel or Delete Report?'}</h3>
                <p className="text-xs text-slate-500">{isSinhala ? 'ප්‍රවේශපත්‍රය:' : 'Ticket:'} {deletingHazard.ticketNumber}</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                  {deleteError}
                </div>
              )}

              <p className="text-slate-700 leading-relaxed">
                {isSinhala ? 'මෙම අනතුරු වාර්තාව ඉවත් කිරීමට ඔබ කැමති ක්‍රමය තෝරන්න:' : 'Choose how you wish to remove this hazard report'} (<strong>{getCategoryText(deletingHazard.category)}</strong>):
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isSinhala ? 'විකල්පය 1: වාර්තාව අවලංගු කරන්න (නිර්දේශිතයි)' : 'Option 1: Cancel Report (Recommended)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isSinhala
                      ? 'වාර්තාව අවලංගු කළ බවට සලකුණු කර සක්‍රීය අලුත්වැඩියා පෝලිමෙන් ඉවත් කරන අතර විගණන වාර්තාව සුරක්ෂිතව තබා ගනී.'
                      : 'Marks the ticket as Cancelled and removes it from the active municipal repair queue while preserving the audit record.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-red-100 bg-red-50/50 space-y-1">
                  <div className="font-bold text-red-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    <span>{isSinhala ? 'විකල්පය 2: ස්ථිරවම මකා දමන්න' : 'Option 2: Permanent Deletion'}</span>
                  </div>
                  <p className="text-[11px] text-red-600">
                    {isSinhala
                      ? 'දත්ත ගබඩාවෙන් වාර්තාව සහ ඊට අදාළ AI විශ්ලේෂණයන් සම්පූර්ණයෙන්ම සහ ආපසු හැරවිය නොහැකි ලෙස ඉවත් කරයි.'
                      : 'Completely and irreversibly removes the report and its attached AI analyses from the database.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingHazard(null)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  {isSinhala ? 'වාර්තාව තබා ගන්න' : 'Keep Report'}
                </button>

                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={() => handleDeleteHazard(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors cursor-pointer"
                >
                  {deleteSubmitting ? (isSinhala ? 'ක්‍රියාත්මක වෙමින්...' : 'Processing...') : (isSinhala ? 'වාර්තාව අවලංගු කරන්න' : 'Cancel Report')}
                </button>

                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={() => handleDeleteHazard(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors cursor-pointer"
                >
                  {deleteSubmitting ? (isSinhala ? 'මකමින් පවතී...' : 'Deleting...') : (isSinhala ? 'ස්ථිරවම මකන්න' : 'Delete Permanently')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 5: PHOTO EVIDENCE LIGHTBOX MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeLightboxImage && (
        <div
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>{isSinhala ? 'අනතුර පිළිබඳ ඡායාරූප සාක්ෂි' : 'Hazard Photographic Evidence'}</span>
              </div>
              <button
                onClick={() => setActiveLightboxImage(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-slate-100 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={activeLightboxImage}
                alt="Enlarged Hazard Evidence"
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
              <span>{isSinhala ? 'පුරවැසි වාර්තාකරු විසින් ලබාගෙන සහතික කර ඇත' : 'Captured and certified by citizen reporter'}</span>
              <a
                href={activeLightboxImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-700 hover:underline font-semibold flex items-center gap-1"
              >
                <span>{isSinhala ? 'සම්පූර්ණ ප්‍රමාණයෙන් බලන්න' : 'Open Full Size'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
