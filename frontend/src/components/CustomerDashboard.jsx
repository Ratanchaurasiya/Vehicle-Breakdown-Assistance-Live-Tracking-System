import { useState, useEffect } from 'react';
import { Car, Bike, Truck, ShieldAlert, FileText, Star, Sparkles, Navigation, MessageSquare, AlertCircle, ShieldCheck, Clock, Wrench, ChevronLeft, ChevronRight, Locate, X } from 'lucide-react';
import MapComponent from './MapComponent';
import ChatComponent from './ChatComponent';
import { apiPath } from '../config/api';

// Helper to return class icon for registered vehicles
const getVehicleIcon = (type) => {
  const t = type.toLowerCase();
  if (t.includes('truck') || t.includes('bus')) {
    return <Truck size={20} style={{ color: 'var(--warning)' }} />;
  }
  if (t.includes('bike') || t.includes('scooter')) {
    return <Bike size={20} style={{ color: 'var(--primary)' }} />;
  }
  return <Car size={20} style={{ color: 'var(--success)' }} />;
};

// Rapido-style service vehicles options
const serviceVehicleOptions = [
  {
    id: 'rapid-bike',
    name: 'Rapid two-wheeler Mechanic',
    desc: 'For flat tyres, spark plug checks & battery jumps of bikes/scooters.',
    icon: <Bike size={24} style={{ color: 'var(--primary)' }} />,
    baseFare: 150,
    eta: 8,
    matchTypes: ['scooter', 'commuter bike', 'superbike', 'cruiser bike']
  },
  {
    id: 'service-van',
    name: 'Mobile Service Van',
    desc: 'For four-wheelers: coolant refills, minor mechanical checks & tools.',
    icon: <Car size={24} style={{ color: 'var(--success)' }} />,
    baseFare: 350,
    eta: 12,
    matchTypes: ['sedan/hatchback', 'suv', 'luxury car']
  },
  {
    id: 'flatbed-tow',
    name: 'Flatbed Tow Truck',
    desc: 'Full-loading flatbed tow truck to transport non-starting cars to garages.',
    icon: <Truck size={24} style={{ color: 'var(--warning)' }} />,
    baseFare: 1200,
    eta: 20,
    matchTypes: ['sedan/hatchback', 'suv', 'luxury car']
  },
  {
    id: 'heavy-crane',
    name: 'Heavy Recovery Crane',
    desc: 'For trucks, commercial vans, and buses. Heavy towing equipment.',
    icon: <Truck size={24} style={{ color: 'var(--error)' }} />,
    baseFare: 2500,
    eta: 30,
    matchTypes: ['light truck', 'heavy truck', 'bus']
  }
];

const vehicleTypeOptions = [
  'Bike', 'Sports Bike', 'Car', 'Sports Car', 'SUV', 'Truck', 'Bus', 'Van', 'Auto Rickshaw', 'Other'
];

const vehicleBrandOptions = [
  'Honda', 'Hero', 'Bajaj', 'TVS', 'Yamaha', 'Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Toyota', 'Other'
];

const detectVehicleType = (typeStr) => {
  const t = (typeStr || '').toLowerCase();
  if (t.includes('sports bike')) return 'Sports Bike';
  if (t.includes('bike') || t.includes('scooter') || t.includes('two-wheeler')) return 'Bike';
  if (t.includes('sports car')) return 'Sports Car';
  if (t.includes('suv')) return 'SUV';
  if (t.includes('truck')) return 'Truck';
  if (t.includes('bus')) return 'Bus';
  if (t.includes('van')) return 'Van';
  if (t.includes('rickshaw') || t.includes('auto')) return 'Auto Rickshaw';
  if (t.includes('car')) return 'Car';
  return 'Other';
};

const detectVehicleBrand = (nameStr) => {
  const name = (nameStr || '').toLowerCase();
  for (const brand of vehicleBrandOptions) {
    if (brand === 'Other') continue;
    if (name.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return 'Other';
};

export default function CustomerDashboard({ socket, user }) {
  const [vehicles, setVehicles] = useState([]);
  const [activeReq, setActiveReq] = useState(null);
  const [garages, setGarages] = useState([]);
  const [history, setHistory] = useState([]);
  
  // New Vehicle form state
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vName, setVName] = useState('');
  const [vNumber, setVNumber] = useState('');
  const [vType, setVType] = useState('Sedan/Hatchback');
  const [vModel, setVModel] = useState('2023');

  // Breakdown Request Form State - Detailed vehicle and problem info
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleBrand, setVehicleBrand] = useState('Tata');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedProblems, setSelectedProblems] = useState(['Tyre Puncture']);
  const [problemDesc, setProblemDesc] = useState('');
  const [selectedGarage, setSelectedGarage] = useState(null);

  // Selected category and custom details
  const [selectedCategory, setSelectedCategory] = useState('Car'); // 'Car', 'Bike', 'Truck'
  const [isCustomVehicle, setIsCustomVehicle] = useState(false);

  // Rapido-style service type selection
  const [selectedServiceType, setSelectedServiceType] = useState('service-van');

  // AI-Based problem scanner mockup
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiOutput, setAiOutput] = useState(null);
  const [mockImgType, setMockImgType] = useState('');

  // Payment State
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Review state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Navigation Panel
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState('request'); // 'request', 'vehicles', 'history', 'support'

  // Mock location coordinate
  const [customerCoord, setCustomerCoord] = useState([12.9716, 77.5946]); // Bangalore center

  // Multi-step booking states
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingCategory, setBookingCategory] = useState('');
  const [bookingBrand, setBookingBrand] = useState('Honda');
  const [bookingModel, setBookingModel] = useState('');
  const [bookingNumber, setBookingNumber] = useState('');
  const [bookingColor, setBookingColor] = useState('Black');
  const [bookingFuelType, setBookingFuelType] = useState('Petrol');
  const [bookingYear, setBookingYear] = useState('2023');
  const [bookingProblems, setBookingProblems] = useState([]);
  const [bookingCustomDesc, setBookingCustomDesc] = useState('');
  const [bookingLat, setBookingLat] = useState(12.9716);
  const [bookingLng, setBookingLng] = useState(77.5946);
  const [isLocating, setIsLocating] = useState(false);
  const [bookingGarage, setBookingGarage] = useState(null);

  // Haversine formula to compute distance in km
  const getDistance = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return 1.5;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Detect GPS Location
  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBookingLat(pos.coords.latitude);
        setBookingLng(pos.coords.longitude);
        setCustomerCoord([pos.coords.latitude, pos.coords.longitude]);
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Prefill details from registered vehicles when moving to Step 2
  const handleNextToStep2 = () => {
    if (!bookingCategory) {
      alert('Please select a vehicle category before continuing.');
      return;
    }

    const matched = vehicles.find(v => {
      const vCat = getVehicleCategory(v.type).toLowerCase();
      const bCat = bookingCategory.toLowerCase();
      if (bCat === 'scooter' && (vCat === 'bike' || vCat === 'scooter')) return true;
      if (bCat === 'sports car' && (vCat === 'car' || vCat === 'sports car')) return true;
      if (bCat === 'suv' && (vCat === 'car' || vCat === 'suv')) return true;
      return vCat === bCat || vCat.includes(bCat) || bCat.includes(vCat);
    });

    if (matched) {
      const brandDetected = detectVehicleBrand(matched.name);
      setBookingBrand(brandDetected);
      let modelPart = matched.name;
      if (brandDetected && brandDetected !== 'Other' && matched.name.toLowerCase().startsWith(brandDetected.toLowerCase())) {
        modelPart = matched.name.substring(brandDetected.length).trim();
      }
      setBookingModel(modelPart);
      setBookingNumber(matched.number);
      setBookingYear(matched.model || '2023');
    } else {
      setBookingBrand('Honda');
      setBookingModel('');
      setBookingNumber('');
      setBookingColor('Black');
      setBookingFuelType('Petrol');
      setBookingYear('2023');
    }
    setBookingStep(2);
  };

  // Auto trigger GPS detection when loading Step 4
  useEffect(() => {
    if (bookingStep === 4) {
      detectLocation();
    }
  }, [bookingStep]);

  // Dynamic garages list sorted by distance
  const sortedGarages = [...garages]
    .map(g => {
      const distance = getDistance(bookingLat, bookingLng, g.lat, g.lng);
      const serviceCharge = 250 + Math.round(Math.max(0, g.rating - 4.0) * 150);
      const eta = Math.max(5, Math.round(distance * 4) + 6);
      return { ...g, distance, serviceCharge, eta };
    })
    .sort((a, b) => a.distance - b.distance || b.rating - a.rating);

  // Auto select default garage
  useEffect(() => {
    if (sortedGarages.length > 0 && !bookingGarage) {
      setBookingGarage(sortedGarages[0]);
    }
  }, [bookingLat, bookingLng, garages]);

  const handleLocChange = (coords) => {
    setBookingLat(coords[0]);
    setBookingLng(coords[1]);
    setCustomerCoord(coords);
  };

  const handleWizardBook = async () => {
    if (!bookingModel.trim() || !bookingNumber.trim()) {
      alert('Please fill out vehicle model and registration number.');
      return;
    }
    if (bookingProblems.length === 0 && !bookingCustomDesc.trim()) {
      alert('Please select or specify at least one problem.');
      return;
    }

    const garage = bookingGarage || sortedGarages[0];
    if (!garage) {
      alert('No garages available.');
      return;
    }

    const finalProblem = bookingProblems.length > 0 ? bookingProblems.join(', ') : 'Custom Issue';
    const serviceCategoryName = 
      bookingCategory === 'Bike' || bookingCategory === 'Scooter' ? 'Rapid two-wheeler Mechanic' :
      bookingCategory === 'Car' || bookingCategory === 'SUV' || bookingCategory === 'Sports Car' ? 'Mobile Service Van' :
      bookingCategory === 'Truck' ? 'Flatbed Tow Truck' : 'Heavy Recovery Crane';

    const baseFare = 
      bookingCategory === 'Bike' || bookingCategory === 'Scooter' ? 150 :
      bookingCategory === 'Car' ? 350 :
      bookingCategory === 'SUV' ? 450 :
      bookingCategory === 'Sports Car' ? 600 :
      bookingCategory === 'Truck' ? 1200 : 1800; // Bus

    const problemTypeParam = `${finalProblem} [Service Class: ${serviceCategoryName}]`;
    const vehicleNameParam = `${bookingColor} ${bookingBrand} ${bookingModel} (${bookingFuelType}) [Reg: ${bookingNumber}]`;
    const totalFare = baseFare + garage.serviceCharge;
    const invoiceItems = [
      { name: `${serviceCategoryName} Base Fee`, cost: baseFare },
      { name: `${garage.name} Diagnostic Fee`, cost: garage.serviceCharge }
    ];

    try {
      const res = await fetch(apiPath('/api/request/new'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          vehicleId: 'custom',
          vehicleName: vehicleNameParam,
          vehicleCategory: bookingCategory,
          vehicleType: bookingCategory,
          vehicleBrand: bookingBrand,
          vehicleModel: bookingModel,
          vehicleNumber: bookingNumber,
          vehicleColor: bookingColor,
          fuelType: bookingFuelType,
          manufacturingYear: bookingYear,
          problemType: problemTypeParam,
          description: bookingCustomDesc,
          lat: bookingLat,
          lng: bookingLng,
          garageId: garage.id,
          garageName: garage.name,
          garageLat: garage.lat,
          garageLng: garage.lng,
          garageRating: garage.rating,
          garageDistance: garage.distance,
          serviceCharge: garage.serviceCharge,
          baseFare,
          estimatedCost: totalFare,
          eta: garage.eta,
          items: invoiceItems
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveReq(data.request);

        setIsBookingOpen(false);
        setBookingStep(1);
        setActiveTab('request');
      }
    } catch (err) {
      console.error(err);
      alert('Booking failed. Please try again.');
    }
  };

  const getVehicleCategory = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('bike') || t.includes('scooter') || t.includes('motorcycle') || t.includes('two-wheeler')) return 'Bike';
    if (t.includes('truck') || t.includes('bus') || t.includes('heavy') || t.includes('crane') || t.includes('commercial')) return 'Truck';
    return 'Car';
  };

  function autoSelectServiceVehicle(vehicleType) {
    const vt = vehicleType.toLowerCase();
    const matched = serviceVehicleOptions.find(opt => opt.matchTypes.includes(vt));
    if (matched) {
      setSelectedServiceType(matched.id);
    }
  }

  const handleCategoryChange = (category, currentVehicles = vehicles) => {
    setSelectedCategory(category);
    const matched = currentVehicles.find(v => getVehicleCategory(v.type) === category);
    if (matched) {
      setSelectedVehicle(matched.id);
      setIsCustomVehicle(false);
      autoSelectServiceVehicle(matched.type);

      const typeMapped = detectVehicleType(matched.type);
      setVehicleType(typeMapped);
      const brandDetected = detectVehicleBrand(matched.name);
      setVehicleBrand(brandDetected);
      let modelPart = matched.name;
      if (brandDetected && brandDetected !== 'Other' && matched.name.toLowerCase().startsWith(brandDetected.toLowerCase())) {
        modelPart = matched.name.substring(brandDetected.length).trim();
      }
      setVehicleModel(modelPart);
      setVehicleNumber(matched.number);
    } else {
      setSelectedVehicle('');
      setIsCustomVehicle(true);
      setVehicleType(category === 'Bike' ? 'Bike' : category === 'Truck' ? 'Truck' : 'Car');
      setVehicleBrand('Other');
      setVehicleModel('');
      setVehicleNumber('');
    }
  };

  const fetchData = async () => {
    try {
      const vehRes = await fetch(apiPath(`/api/vehicles?userId=${user.id}`));
      const vehData = await vehRes.json();
      setVehicles(vehData || []);
      
      if (vehData && vehData.length > 0) {
        let matched = vehData.find(v => getVehicleCategory(v.type) === selectedCategory);
        if (!matched) {
          matched = vehData[0];
          const cat = getVehicleCategory(matched.type);
          setSelectedCategory(cat);
        }
        
        setSelectedVehicle(matched.id);
        setIsCustomVehicle(false);
        autoSelectServiceVehicle(matched.type);

        const typeMapped = detectVehicleType(matched.type);
        setVehicleType(typeMapped);
        const brandDetected = detectVehicleBrand(matched.name);
        setVehicleBrand(brandDetected);
        let modelPart = matched.name;
        if (brandDetected && brandDetected !== 'Other' && matched.name.toLowerCase().startsWith(brandDetected.toLowerCase())) {
          modelPart = matched.name.substring(brandDetected.length).trim();
        }
        setVehicleModel(modelPart);
        setVehicleNumber(matched.number);
      } else {
        setIsCustomVehicle(true);
        setVehicleType('Car');
        setVehicleBrand('Other');
        setVehicleModel('');
        setVehicleNumber('');
      }

      const garRes = await fetch(apiPath('/api/garages'));
      const garData = await garRes.json();
      setGarages(garData || []);

      const repRes = await fetch(apiPath('/api/admin/reports'));
      const repData = await repRes.json();
      setHistory(repData.history ? repData.history.filter(h => h.userId === user.id) : []);

      const actRes = await fetch(apiPath(`/api/request/active?userId=${user.id}`));
      const actData = await actRes.json();
      if (actData && actData.length > 0) {
        setActiveReq(actData[0]);
      } else {
        setActiveReq(null);
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
    }
  };

  useEffect(() => {
    fetchData();

    if (!socket) return;

    socket.emit('join_room', { role: 'customer', id: user.id });

    // Listeners for active request updates
    socket.on('request_accepted', (req) => {
      setActiveReq(req);
      fetchData();
    });

    socket.on('location_updated', (data) => {
      setActiveReq(prev => {
        if (prev) {
          return {
            ...prev,
            eta: data.eta,
            mechanic: { ...prev.mechanic, lat: data.lat, lng: data.lng }
          };
        }
        return prev;
      });
    });

    socket.on('geofence_alert', (log) => {
      alert(`🔔 AutoRescue Notification:\n${log.message}`);
    });

    socket.on('status_updated', (data) => {
      setActiveReq(prev => prev ? { ...prev, status: data.status } : null);
    });

    socket.on('invoice_updated', (req) => {
      setActiveReq(req);
    });

    socket.on('coupon_applied', (data) => {
      if (data.success) {
        setActiveReq(prev => prev ? { ...prev, discount: data.discount, finalAmount: data.finalAmount } : null);
        setCouponError('');
      } else {
        setCouponError(data.message);
      }
    });

    socket.on('payment_confirmed', () => {
      setActiveReq(null);
      setFeedbackSubmitted(false);
      fetchData();
      alert('💳 Payment verified! Thank you for using AutoRescue.');
    });

    socket.on('request_cancelled', (data = {}) => {
      if (!data.userId && !data.requestId) {
        setActiveReq(null);
        fetchData();
        return;
      }

      setActiveReq(prev => {
        if (data.userId === user.id || data.requestId === prev?.id) {
          fetchData();
          return null;
        }
        return prev;
      });
    });

    return () => {
      socket.off('request_accepted');
      socket.off('location_updated');
      socket.off('geofence_alert');
      socket.off('status_updated');
      socket.off('invoice_updated');
      socket.off('coupon_applied');
      socket.off('payment_confirmed');
      socket.off('request_cancelled');
    };
  }, [socket, user]);

  const handleVehicleChange = (vehicleId) => {
    if (vehicleId === 'custom') {
      setIsCustomVehicle(true);
      setSelectedVehicle('');
      setVehicleType(selectedCategory === 'Bike' ? 'Bike' : selectedCategory === 'Truck' ? 'Truck' : 'Car');
      setVehicleBrand('Other');
      setVehicleModel('');
      setVehicleNumber('');
    } else {
      setIsCustomVehicle(false);
      setSelectedVehicle(vehicleId);
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        setSelectedCategory(getVehicleCategory(vehicle.type));
        autoSelectServiceVehicle(vehicle.type);

        const typeMapped = detectVehicleType(vehicle.type);
        setVehicleType(typeMapped);
        const brandDetected = detectVehicleBrand(vehicle.name);
        setVehicleBrand(brandDetected);
        let modelPart = vehicle.name;
        if (brandDetected && brandDetected !== 'Other' && vehicle.name.toLowerCase().startsWith(brandDetected.toLowerCase())) {
          modelPart = vehicle.name.substring(brandDetected.length).trim();
        }
        setVehicleModel(modelPart);
        setVehicleNumber(vehicle.number);
      }
    }
  };

  const handleAddVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!vName.trim() || !vNumber.trim()) return;

    try {
      const res = await fetch(apiPath('/api/vehicles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: vName, number: vNumber, type: vType, model: vModel, userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        const updatedVehicles = [...vehicles, data.vehicle];
        setVehicles(updatedVehicles);
        setSelectedVehicle(data.vehicle.id);
        const cat = getVehicleCategory(data.vehicle.type);
        setSelectedCategory(cat);
        setIsCustomVehicle(false);
        autoSelectServiceVehicle(data.vehicle.type);

        const typeMapped = detectVehicleType(data.vehicle.type);
        setVehicleType(typeMapped);
        const brandDetected = detectVehicleBrand(data.vehicle.name);
        setVehicleBrand(brandDetected);
        let modelPart = data.vehicle.name;
        if (brandDetected && brandDetected !== 'Other' && data.vehicle.name.toLowerCase().startsWith(brandDetected.toLowerCase())) {
          modelPart = data.vehicle.name.substring(brandDetected.length).trim();
        }
        setVehicleModel(modelPart);
        setVehicleNumber(data.vehicle.number);

        setVName('');
        setVNumber('');
        setShowAddVehicle(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run mock AI Image scanner
  const runAiDiagnosis = () => {
    if (!mockImgType) {
      alert('Please choose a mock picture option to scan.');
      return;
    }
    setAiAnalyzing(true);
    setAiOutput(null);

    setTimeout(() => {
      setAiAnalyzing(false);
      if (mockImgType === 'smoke') {
        setSelectedProblems(['Overheating', 'Engine Problem']);
        setAiOutput({
          issue: 'Coolant Radiator Leaking / Radiator Damage',
          confidence: '94%',
          estCost: '₹2,500 - ' + (vehicleType.toLowerCase().includes('truck') || vehicleType.toLowerCase().includes('bus') ? '₹8,500' : '₹3,800'),
          recs: 'Do NOT open the hood if steam is high. Let it cool down. Fill with water if nearby, otherwise book towing/mechanic service immediately.',
          boundingBox: { x: '25%', y: '30%', width: '50%', height: '40%' }
        });
      } else if (mockImgType === 'flat') {
        setSelectedProblems(['Tyre Puncture']);
        setAiOutput({
          issue: 'Nail Puncture in Tyre wall',
          confidence: '98%',
          estCost: vehicleType.toLowerCase().includes('truck') || vehicleType.toLowerCase().includes('bus') ? '₹800 - ₹1,500' : '₹200 - ₹400',
          recs: 'Puncture tool patch repairs recommended. Drive slowly to avoid tyre rim damage.',
          boundingBox: { x: '40%', y: '45%', width: '20%', height: '20%' }
        });
      } else if (mockImgType === 'oil') {
        setSelectedProblems(['Engine Problem', 'Other']);
        setAiOutput({
          issue: 'Engine Gasket Leak / Oil Depleted',
          confidence: '89%',
          estCost: '₹1,500 - ' + (vehicleType.toLowerCase().includes('truck') || vehicleType.toLowerCase().includes('bus') ? '₹6,000' : '₹2,500'),
          recs: 'Low oil pressure detected. Long drives may seize the engine. Engine oil top-up required.',
          boundingBox: { x: '10%', y: '20%', width: '80%', height: '60%' }
        });
      }
    }, 2000);
  };

  const handleBookService = async (overrideProblem = null, overrideDesc = null) => {
    if (!vehicleModel.trim() || !vehicleNumber.trim()) {
      alert('Please specify both the vehicle model and registration number in the Vehicle Details section.');
      return;
    }
    if (!overrideProblem && selectedProblems.length === 0) {
      alert('Please select at least one Problem Type.');
      return;
    }
    
    const garage = selectedGarage || (garages && garages.length > 0 ? garages[0] : null);
    if (!garage) {
      alert('Recommended garages are still loading from the server. Please check your backend database connection or wait a moment before booking.');
      return;
    }
    const serviceOption = serviceVehicleOptions.find(opt => opt.id === selectedServiceType);
    const distance = getDistance(customerCoord[0], customerCoord[1], garage.lat, garage.lng);
    const serviceCharge = garage.serviceCharge || 250 + Math.round(Math.max(0, garage.rating - 4.0) * 150);
    const eta = garage.eta || Math.max(5, Math.round(distance * 4) + 6);
    const totalFare = serviceOption.baseFare + serviceCharge;
    const invoiceItems = [{ name: `${serviceOption.name} Base Fee`, cost: serviceOption.baseFare }];

    const vehicleNameParam = `${vehicleBrand} ${vehicleModel} [Reg: ${vehicleNumber}]`;
    const finalProblem = overrideProblem || (selectedProblems.join(', ') + ` [Service Class: ${serviceOption.name}]`);

    try {
      const res = await fetch(apiPath('/api/request/new'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          vehicleId: isCustomVehicle ? 'custom' : selectedVehicle,
          vehicleName: vehicleNameParam,
          vehicleCategory: selectedCategory,
          vehicleType: vehicleType,
          vehicleBrand: vehicleBrand,
          vehicleModel: vehicleModel,
          vehicleNumber: vehicleNumber,
          problemType: finalProblem,
          description: overrideDesc || (problemDesc + (aiOutput ? ` [AI Diagnostic: ${aiOutput.issue}]` : '')),
          lat: customerCoord[0],
          lng: customerCoord[1],
          garageId: garage.id,
          garageName: garage.name,
          garageLat: garage.lat,
          garageLng: garage.lng,
          garageRating: garage.rating,
          garageDistance: distance,
          serviceCharge,
          baseFare: serviceOption.baseFare,
          estimatedCost: totalFare,
          eta,
          items: invoiceItems
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveReq(data.request);
        setActiveTab('request');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerSOS = async () => {
    let vehicleNameParam = `Other ${selectedCategory}`;
    if (vehicleModel.trim()) {
      vehicleNameParam = `${vehicleBrand} ${vehicleModel}`;
    }

    socket.emit('trigger_sos', {
      userId: user.id,
      lat: customerCoord[0],
      lng: customerCoord[1],
      vehicleName: vehicleNameParam,
      vehicleCategory: selectedCategory
    });
    await handleBookService('Emergency SOS', 'Emergency SOS roadside assistance requested. Prioritize nearest available mechanic.');
    alert('🚨 SOS Alert Triggered! Nearest ambulance, police, and mechanics have been notified. AutoRescue dashboard has flagged your status.');
  };

  const handleApplyCoupon = () => {
    if (!socket || !activeReq) return;
    socket.emit('apply_coupon', { requestId: activeReq.id, couponCode });
  };

  const handlePaymentSubmit = () => {
    if (!socket || !activeReq) return;
    socket.emit('complete_payment', { requestId: activeReq.id, paymentMethod });
  };

  const handleCancelBooking = async () => {
    if (!activeReq) return;

    try {
      await fetch(apiPath('/api/request/cancel'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: activeReq.id, userId: user.id })
      });
      setActiveReq(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Unable to cancel this booking right now.');
    }
  };

  const handleFeedbackSubmit = () => {
    if (!socket || history.length === 0) return;
    const latestHistory = history[history.length - 1];
    socket.emit('submit_feedback', {
      historyId: latestHistory.id,
      rating: feedbackRating,
      review: feedbackText
    });
    setFeedbackSubmitted(true);
    fetchData();
  };

  // Predictive Maintenance Alerts logic
  const getPredictiveAlerts = () => {
    const alerts = [];
    if (history.length > 0) {
      const oilService = history.find(h => h.problemType.toLowerCase().includes('oil') || h.items.some(i => i.name.toLowerCase().includes('oil')));
      if (oilService) {
        alerts.push({
          type: 'Engine Oil Service Due',
          message: 'It has been over 6 months since your last engine oil replacement.',
          actionProblem: 'Engine Oil Change',
          actionDesc: 'Periodic maintenance: Engine oil change recommended.',
          severity: 'warning'
        });
      }

      const tyreService = history.find(h => h.problemType.toLowerCase().includes('tyre') || h.problemType.toLowerCase().includes('puncture'));
      if (tyreService) {
        alerts.push({
          type: 'Tyre Tread Inspection Due',
          message: 'Previous tyre repair noted. Wheel alignment & pressure inspection is advised.',
          actionProblem: 'Tyre Inspection',
          actionDesc: 'Check alignment and safety parameters.',
          severity: 'info'
        });
      }
    } else {
      alerts.push({
        type: 'First General Inspection Due',
        message: 'No active history logs for this vehicle. Ensure basic safety parameters are verified.',
        actionProblem: 'General Diagnostics',
        actionDesc: 'Initial checkup of fluids, brakes, and electrical nodes.',
        severity: 'info'
      });
    }
    return alerts;
  };

  return (
    <div className="animate-slide-up" style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      
      {/* Premium Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={26} style={{ color: 'var(--primary)' }} /> AutoRescue Customer Hub
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Real-time breakdown assistance, interactive route tracking, and service records.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <img src={user.avatar} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--primary)' }} />
            <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>{user.name}</span>
          </div>
          <button 
            onClick={triggerSOS}
            className="btn-danger" 
            style={{ padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '11px', animation: 'pulse-pin 2s infinite' }}
          >
            <ShieldAlert size={14} /> 1-TAP SOS
          </button>
        </div>
      </div>

      {/* Modern Top Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px', paddingBottom: '1px', flexWrap: 'wrap' }}>
        {[
          { id: 'request', label: 'Request Assistance', icon: <Navigation size={15} /> },
          { id: 'vehicles', label: 'My Vehicles & Alerts', icon: <Car size={15} /> },
          { id: 'history', label: 'Service Book & Invoices', icon: <FileText size={15} /> },
          { id: 'support', label: 'Disputes & Emergency', icon: <ShieldAlert size={15} /> }
        ].map((tab) => {
          const isCurrent = activeTab === tab.id;
          return (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                background: isCurrent ? 'var(--primary-glow)' : 'transparent', 
                color: isCurrent ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: isCurrent ? '2px solid var(--primary)' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                padding: '10px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: isCurrent ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'request' && activeReq && (
                <span className="status-dot active" style={{ width: '6px', height: '6px', marginLeft: '4px' }}></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'request' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '24px' }}>
          
          {/* Left Column: Form or Active Tracker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activeReq ? (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', color: '#fff', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Navigation size={18} style={{ color: 'var(--primary)' }} /> Active Request Progress
                </h3>
                {activeReq.status !== 'completed' && (
                  <button onClick={handleCancelBooking} className="btn-danger" style={{ width: '100%', padding: '9px 12px', fontSize: '12px', marginBottom: '16px' }}>
                    Cancel Booking
                  </button>
                )}

                <div className="glass-card" style={{ padding: '12px', marginBottom: '16px', borderLeft: '4px solid var(--primary)', background: 'rgba(99,102,241,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Assistance Details</span>
                    <span style={{ 
                      background: 'rgba(99, 102, 241, 0.15)', 
                      color: 'var(--primary)', 
                      fontSize: '10px', 
                      fontWeight: 'bold', 
                      padding: '2px 8px', 
                      borderRadius: '12px' 
                    }}>
                      {activeReq.vehicleCategory === 'Bike' ? '🏍️ Bike / Scooter' : activeReq.vehicleCategory === 'Truck' ? '🚚 Truck / Bus' : '🚗 Car'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginTop: '6px' }}>{activeReq.vehicleName}</div>
                  {activeReq.vehicleBrand && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Brand: <b>{activeReq.vehicleBrand}</b> • Type: <b>{activeReq.vehicleType}</b>
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <b>Reported Issue:</b> {activeReq.problemType}
                  </div>
                  {activeReq.description && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                      "{activeReq.description}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', marginBottom: '20px' }}>
                  {[
                    { label: 'Request Sent', done: true },
                    { label: 'Mechanic Assigned', done: ['accepted', 'arrived', 'inspecting', 'repairing', 'completed'].includes(activeReq.status) },
                    { label: 'Mechanic Arrived', done: ['arrived', 'inspecting', 'repairing', 'completed'].includes(activeReq.status) },
                    { label: 'Inspection / Repairing', done: ['inspecting', 'repairing', 'completed'].includes(activeReq.status) },
                    { label: 'Repair Completed', done: activeReq.status === 'completed' }
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%', 
                        background: step.done ? 'var(--success)' : 'transparent',
                        border: step.done ? 'none' : '2px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '10px', fontWeight: 'bold'
                      }}>
                        {step.done ? '✓' : idx + 1}
                      </div>
                      <span style={{ color: step.done ? '#fff' : 'var(--text-secondary)', fontWeight: step.done ? '600' : 'normal' }}>{step.label}</span>
                    </div>
                  ))}
                </div>

                {activeReq.mechanic ? (
                  <div className="glass-card" style={{ padding: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={activeReq.mechanic.avatar} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{activeReq.mechanic.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Phone: {activeReq.mechanic.phone}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activeReq.mechanic.garageName} (⭐ {activeReq.mechanic.rating || '4.8'})</div>
                      </div>
                      <button onClick={() => setShowChat(!showChat)} className="btn-secondary" style={{ padding: '6px 8px', borderRadius: '8px' }}>
                        <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
                      </button>
                    </div>
                    {(activeReq.eta || activeReq.estimatedArrivalTime) && (
                      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--warning)', fontWeight: 'bold' }}>
                        Estimated Arrival Time: {activeReq.eta || activeReq.estimatedArrivalTime} mins
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '12px 0', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    🔍 Finding nearest mechanic...
                  </div>
                )}

                {showChat && activeReq.mechanic && (
                  <div style={{ marginTop: '10px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <ChatComponent 
                      socket={socket} 
                      requestId={activeReq.id}
                      role="customer"
                      recipientName={activeReq.mechanic.name}
                      recipientAvatar={activeReq.mechanic.avatar}
                      onClose={() => setShowChat(false)}
                    />
                  </div>
                )}

                {activeReq.status === 'completed' && (
                  <div className="glass-card" style={{ padding: '16px', marginTop: '16px', background: 'rgba(16,185,129,0.05)', border: '1px solid var(--success)' }}>
                    <h4 style={{ fontSize: '14px', color: '#fff', marginBottom: '8px' }}>Bill Receipt & Checkout</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
                      <thead>
                        <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                          <th style={{ padding: '4px 0' }}>Job Item</th>
                          <th style={{ padding: '4px 0', textAlign: 'right' }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeReq.items.map((item, idx) => (
                          <tr key={idx} style={{ color: '#fff' }}>
                            <td style={{ padding: '4px 0' }}>{item.name}</td>
                            <td style={{ padding: '4px 0', textAlign: 'right' }}>₹{item.cost}</td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: '1px solid var(--border)', fontWeight: 'bold' }}>
                          <td style={{ padding: '6px 0' }}>Subtotal</td>
                          <td style={{ padding: '6px 0', textAlign: 'right' }}>₹{activeReq.total}</td>
                        </tr>
                        {activeReq.discount > 0 && (
                          <tr style={{ color: 'var(--success)' }}>
                            <td style={{ padding: '4px 0' }}>Discount Code</td>
                            <td style={{ padding: '4px 0', textAlign: 'right' }}>-₹{activeReq.discount}</td>
                          </tr>
                        )}
                        <tr style={{ fontWeight: 'bold', fontSize: '14px', borderTop: '2px double var(--border)' }}>
                          <td style={{ padding: '6px 0' }}>Amount Due</td>
                          <td style={{ padding: '6px 0', textAlign: 'right' }}>₹{activeReq.finalAmount}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <input 
                        type="text" 
                        placeholder="Enter Promo Code (e.g. AUTORESCUE10)" 
                        value={couponCode} 
                        onChange={(e) => setCouponCode(e.target.value)} 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      />
                      <button onClick={handleApplyCoupon} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
                        Apply
                      </button>
                    </div>
                    {couponError && <div style={{ fontSize: '11px', color: 'var(--error)', marginBottom: '8px' }}>{couponError}</div>}

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Select Payment Method</label>
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px' }}>
                        <option value="UPI">Google Pay / PhonePe (UPI)</option>
                        <option value="Credit Card">Credit / Debit Card</option>
                        <option value="Cash">Cash on Delivery</option>
                      </select>
                    </div>

                    <button onClick={handlePaymentSubmit} className="btn-success" style={{ width: '100%', padding: '10px' }}>
                      Confirm Payment & Close Order
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ background: 'var(--primary-glow)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <Wrench size={30} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>Need Roadside Assistance?</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4' }}>
                    Book a real-time rescue service in minutes. Get help for tyre punctures, engine trouble, flat batteries, or vehicle towing.
                  </p>
                </div>

                <button 
                  onClick={() => { setIsBookingOpen(true); setBookingStep(1); setBookingCategory(''); }} 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 'bold', borderRadius: '12px', boxShadow: '0 4px 20px var(--primary-glow)', animation: 'pulse-pin 2.5s infinite' }}
                >
                  Book Service Now
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px' }}>⚡</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>Instant Match</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px' }}>🏬</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>Expert Garages</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px' }}>🧭</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>Live Tracking</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Tracking Map */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '600px' }}>
            <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={16} /> Live Assistance Tracking Map
            </h3>
            <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden' }}>
              <MapComponent 
                customerLoc={activeReq ? [activeReq.customerLat, activeReq.customerLng] : customerCoord}
                garageLoc={activeReq?.garageLat && activeReq?.garageLng ? [activeReq.garageLat, activeReq.garageLng] : null}
                mechanicLoc={activeReq && activeReq.mechanic ? [activeReq.mechanic.lat, activeReq.mechanic.lng] : null}
              />
            </div>
          </div>

        </div>
      )}

      {activeTab === 'vehicles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Register New Vehicle */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={18} style={{ color: 'var(--primary)' }} /> Register New Vehicle
            </h3>
            <form onSubmit={handleAddVehicleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Vehicle Model Name</label>
                <input type="text" placeholder="e.g. Maruti Swift, Tata Nexon" value={vName} onChange={(e) => setVName(e.target.value)} required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Registration Number</label>
                <input type="text" placeholder="e.g. DL-03-AA-9999" value={vNumber} onChange={(e) => setVNumber(e.target.value)} required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Vehicle Type Category</label>
                  <select value={vType} onChange={(e) => setVType(e.target.value)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <option value="Car">Car</option>
                    <option value="Sedan/Hatchback">Sedan / Hatchback</option>
                    <option value="SUV">SUV</option>
                    <option value="Sports Car">Sports Car</option>
                    <option value="Bike">Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Commuter Bike">Commuter Bike</option>
                    <option value="Superbike">Superbike</option>
                    <option value="Cruiser Bike">Cruiser Bike</option>
                    <option value="Truck">Light Commercial Truck</option>
                    <option value="Heavy Truck">Heavy Duty Truck</option>
                    <option value="Bus">Bus</option>
                    <option value="Van">Van</option>
                    <option value="Auto Rickshaw">Auto Rickshaw</option>
                  </select>
                </div>
                <div style={{ width: '100px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Year Model</label>
                  <input type="text" placeholder="Year" value={vModel} onChange={(e) => setVModel(e.target.value)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }} />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px 16px', marginTop: '8px' }}>
                Save & Register Vehicle
              </button>
            </form>
          </div>

          {/* Right Column: Registered Vehicles List & Alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Car size={16} /> Registered Vehicles List ({vehicles.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {vehicles.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>No vehicles registered yet.</p>
                ) : (
                  vehicles.map((v) => (
                    <div key={v.id} className="glass-card" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: 'var(--primary-glow)', padding: '8px', borderRadius: '8px' }}>
                        {getVehicleIcon(v.type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>{v.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Type: <b>{v.type}</b> • Reg No: <b>{v.number}</b> • Year: <b>{v.model}</b>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Predictive Maintenance Alerts Widget */}
            <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--warning)' }}>
              <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={15} style={{ color: 'var(--warning)' }} /> Predictive Maintenance Alerts
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getPredictiveAlerts().map((alert, idx) => (
                  <div key={idx} className="glass-card" style={{ padding: '10px', fontSize: '11px' }}>
                    <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '2px' }}>{alert.type}</div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{alert.message}</div>
                    <button 
                      onClick={() => {
                        handleBookService(alert.actionProblem, alert.actionDesc);
                        setActiveTab('request');
                      }}
                      disabled={!!activeReq}
                      className="btn-primary" 
                      style={{ padding: '4px 8px', fontSize: '10px', opacity: activeReq ? 0.5 : 1 }}
                    >
                      Schedule Service Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          
          {/* Left Column: KPI Metrics & Ratings */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '4px' }}>Service Analytics</h3>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Completed Trips</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>{history.length}</div>
            </div>
            <div style={{ background: 'var(--success-glow)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: '11px', color: 'var(--success)' }}>Total Amount Spent</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', marginTop: '4px' }}>₹{history.reduce((sum, h) => sum + (h.finalAmount || 0), 0)}</div>
            </div>
            {history.length > 0 && !feedbackSubmitted && !activeReq && (
              <div className="glass-card animate-slide-up" style={{ padding: '12px', border: '1px solid var(--warning)', background: 'var(--warning-glow)' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>Feedback Needed</div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => setFeedbackRating(star)} 
                      style={{ background: 'transparent', padding: '1px', color: star <= feedbackRating ? 'var(--warning)' : 'var(--text-muted)' }}
                    >
                      <Star size={16} fill={star <= feedbackRating ? 'var(--warning)' : 'transparent'} />
                    </button>
                  ))}
                </div>
                <textarea 
                  rows="2" 
                  placeholder="Rate last service..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  style={{ fontSize: '11px', marginBottom: '8px', padding: '6px' }}
                />
                <button onClick={handleFeedbackSubmit} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', width: '100%' }}>
                  Submit Review
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Service Book List */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Digital Service Book History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>No previous records found. Completed bookings will appear here.</p>
              ) : (
                history.map((record) => (
                  <div key={record.id} className="glass-card" style={{ padding: '12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                      <span>{record.problemType} ({record.vehicleName})</span>
                      <span>₹{record.finalAmount}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {record.garageName} • {record.date} • Paid via {record.paymentMethod}
                    </div>
                    {record.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: '11px' }}>
                        <Star size={12} fill="var(--warning)" /> {record.rating} Stars - <span style={{ color: 'var(--text-muted)' }}>"{record.review}"</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'support' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
          
          {/* Left Column: SOS Center */}
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
            <ShieldAlert size={48} style={{ color: 'var(--error)', margin: '0 auto 16px', animation: 'pulse-pin 2s infinite' }} />
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Emergency Assistance Hub</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
              If you are in danger or need immediate help, click the button below. This will trigger a global alarm dispatching mechanics and notification flags across our network.
            </p>
            <button 
              onClick={triggerSOS}
              className="btn-danger" 
              style={{ width: '100%', padding: '16px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px' }}
            >
              <ShieldAlert size={22} /> TRIGGER EMERGENCY SOS
            </button>
            
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', fontSize: '12px' }}>
              <div style={{ color: 'var(--text-secondary)' }}>📞 <b>National Emergency Helpline:</b> 112</div>
              <div style={{ color: 'var(--text-secondary)' }}>📞 <b>AutoRescue Control Room:</b> 1800-123-RESCUE</div>
            </div>
          </div>

          {/* Right Column: Submit dispute ticket */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>Log Dispute / Complaint</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px' }}>Have an issue with pricing, arrival times, or repair quality? Submit a formal ticket directly to system administrators.</p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const subj = e.target.subject.value;
              const det = e.target.details.value;
              const mechName = activeReq && activeReq.mechanic ? activeReq.mechanic.name : (history.length > 0 ? history[history.length - 1].mechanicName : '');
              
              if (!subj || !det) return;
              try {
                const res = await fetch(apiPath('/api/complaints'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userName: user.name, mechanicName: mechName, subject: subj, details: det })
                });
                const data = await res.json();
                if (data.success) {
                  alert('Ticket logged! Admin will review and contact you shortly.');
                  e.target.reset();
                }
              } catch (err) {
                console.error(err);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Subject</label>
                <input name="subject" type="text" placeholder="e.g. Overcharged for tyre replacement" required style={{ fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Details</label>
                <textarea name="details" rows="4" placeholder="Please provide specific details about the encounter..." required style={{ fontSize: '13px' }} />
              </div>
              <button type="submit" className="btn-secondary" style={{ padding: '10px 16px', marginTop: '8px', alignSelf: 'flex-start' }}>
                Submit Dispute Ticket
              </button>
            </form>
          </div>

        </div>
      )}

      {/* 6-Step Vehicle Booking System Modal */}
      {isBookingOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 8, 16, 0.85)', backdropFilter: 'blur(16px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={18} style={{ color: 'var(--primary)' }} /> Rapido-style Booking Wizard
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>Step {bookingStep} of 6: {
                  bookingStep === 1 ? 'Select Vehicle Type' :
                  bookingStep === 2 ? 'Provide Vehicle Specs' :
                  bookingStep === 3 ? 'Specify Problem Details' :
                  bookingStep === 4 ? 'Confirm GPS Location' :
                  bookingStep === 5 ? 'Select Repair Garage' : 'Confirm & Dispatch Booking'
                }</p>
              </div>
              <button 
                onClick={() => setIsBookingOpen(false)} 
                style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '4px', border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ width: `${(bookingStep/6)*100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>

            {/* Modal Content Scroll Box */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              
              {/* STEP 1: Vehicle Selection */}
              {bookingStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Choose Vehicle Category</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    {[
                      { id: 'Bike', label: 'Bike', icon: '🏍️' },
                      { id: 'Scooter', label: 'Scooter', icon: '🛵' },
                      { id: 'Car', label: 'Car', icon: '🚗' },
                      { id: 'SUV', label: 'SUV', icon: '🚘' },
                      { id: 'Truck', label: 'Truck', icon: '🚚' },
                      { id: 'Bus', label: 'Bus', icon: '🚌' },
                      { id: 'Sports Car', label: 'Sports Car', icon: '🏎️' }
                    ].map(cat => {
                      const isSelected = bookingCategory === cat.id;
                      return (
                        <div 
                          key={cat.id} 
                          onClick={() => setBookingCategory(cat.id)}
                          className="glass-card" 
                          style={{ 
                            padding: '16px 12px', 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: isSelected ? 'var(--primary-glow)' : 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            borderRadius: '12px'
                          }}
                        >
                          <span style={{ fontSize: '32px' }}>{cat.icon}</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: isSelected ? '#fff' : 'var(--text-secondary)' }}>{cat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Vehicle Details */}
              {bookingStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Vehicle Details (Prefilled from logs if available)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Vehicle Brand</label>
                      <select value={bookingBrand} onChange={(e) => setBookingBrand(e.target.value)}>
                        {vehicleBrandOptions.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Vehicle Model</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Nexon, Activa, Pulsar" 
                        value={bookingModel} 
                        onChange={(e) => setBookingModel(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Registration Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. KA-03-MM-1234" 
                        value={bookingNumber} 
                        onChange={(e) => setBookingNumber(e.target.value)} 
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Vehicle Color</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Red, Black, White" 
                        value={bookingColor} 
                        onChange={(e) => setBookingColor(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Fuel Type</label>
                      <select value={bookingFuelType} onChange={(e) => setBookingFuelType(e.target.value)}>
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="CNG">CNG</option>
                        <option value="Electric">Electric</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Manufacturing Year</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 2022" 
                        value={bookingYear} 
                        onChange={(e) => setBookingYear(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Problem Selection */}
              {bookingStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Select Specific Problems</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      'Engine Problem',
                      'Battery Issue',
                      'Tyre Puncture',
                      'Brake Failure',
                      'Accident Damage',
                      'Fuel Delivery',
                      'Towing Required',
                      'General Service'
                    ].map(prob => {
                      const isChecked = bookingProblems.includes(prob);
                      return (
                        <div 
                          key={prob}
                          onClick={() => {
                            if (isChecked) {
                              setBookingProblems(bookingProblems.filter(p => p !== prob));
                            } else {
                              setBookingProblems([...bookingProblems, prob]);
                            }
                          }}
                          className="glass-card"
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: isChecked ? 'var(--primary-glow)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: isChecked ? '#fff' : 'var(--text-secondary)',
                            borderRadius: '8px'
                          }}
                        >
                          <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: isChecked ? 'none' : '1px solid var(--text-muted)', background: isChecked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 'bold' }}>
                            {isChecked && '✓'}
                          </div>
                          <span>{prob}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Custom Problem Description (Optional)</label>
                    <textarea 
                      rows="3" 
                      placeholder="Detail any other issues, noises, or symptoms..." 
                      value={bookingCustomDesc} 
                      onChange={(e) => setBookingCustomDesc(e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Location Picking */}
              {bookingStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Verify Breakdown Location</h4>
                    <button 
                      onClick={detectLocation} 
                      className="btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      disabled={isLocating}
                    >
                      <Locate size={12} /> {isLocating ? 'Detecting...' : 'Detect GPS Location'}
                    </button>
                  </div>
                  
                  {/* Coordinates Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Latitude</label>
                      <input 
                        type="number" 
                        step="0.0001" 
                        value={bookingLat} 
                        onChange={(e) => setBookingLat(parseFloat(e.target.value))} 
                        style={{ padding: '6px 10px', fontSize: '12px' }} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Longitude</label>
                      <input 
                        type="number" 
                        step="0.0001" 
                        value={bookingLng} 
                        onChange={(e) => setBookingLng(parseFloat(e.target.value))} 
                        style={{ padding: '6px 10px', fontSize: '12px' }} 
                      />
                    </div>
                  </div>

                  <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>* You can adjust the location coordinates manually above, or click/tap anywhere on the map below to drag the coordinates marker.</p>
                  
                  {/* Miniature Map */}
                  <div style={{ height: '260px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <MapComponent 
                      customerLoc={[bookingLat, bookingLng]} 
                      onCustomerLocChange={handleLocChange}
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: Garage Selection */}
              {bookingStep === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Select Recommended Garage (Sorted by proximity)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {sortedGarages.map((garage) => {
                      const isSelected = bookingGarage?.id === garage.id;
                      return (
                        <div 
                          key={garage.id}
                          onClick={() => setBookingGarage(garage)}
                          className="glass-card"
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: isSelected ? 'var(--primary-glow)' : 'transparent',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderRadius: '10px'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{garage.name}</span>
                              {isSelected && <span style={{ background: 'var(--success-glow)', color: 'var(--success)', fontSize: '8px', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>SELECTED</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              ⭐ {garage.rating} ({garage.reviewsCount} reviews) • 📍 <b>{garage.distance} km away</b>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Services: {garage.services.join(', ')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--success)' }}>₹{garage.serviceCharge}</div>
                            <div style={{ fontSize: '10px', color: 'var(--warning)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '2px' }}>
                              <Clock size={10} /> {garage.eta} mins
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 6: Booking Confirmation */}
              {bookingStep === 6 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Review Service Booking Details</h4>
                  
                  <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Selected Vehicle:</span>
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>{bookingColor} {bookingBrand} {bookingModel} ({bookingCategory})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Registration Number:</span>
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>{bookingNumber} ({bookingFuelType})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Problem Diagnosis:</span>
                      <span style={{ fontWeight: 'bold', color: '#fff', textAlign: 'right', maxWidth: '300px', wordBreak: 'break-all' }}>{bookingProblems.join(', ') || 'Custom Issue'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>GPS Coordinates:</span>
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>[{bookingLat.toFixed(4)}, {bookingLng.toFixed(4)}]</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Assigned Garage:</span>
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>{bookingGarage?.name || sortedGarages[0]?.name}</span>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(16,185,129,0.02)', border: '1px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Estimated Service Cost</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                          ₹{
                            (bookingCategory === 'Bike' || bookingCategory === 'Scooter' ? 150 :
                             bookingCategory === 'Car' ? 350 :
                             bookingCategory === 'SUV' ? 450 :
                             bookingCategory === 'Sports Car' ? 600 :
                             bookingCategory === 'Truck' ? 1200 : 1800) + 
                            (bookingGarage?.serviceCharge || sortedGarages[0]?.serviceCharge || 0)
                          }
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Estimated Arrival Time</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--warning)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <Clock size={16} /> {bookingGarage?.eta || sortedGarages[0]?.eta || 15} mins
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)' }}>
              <button 
                onClick={() => {
                  if (bookingStep > 1) {
                    setBookingStep(bookingStep - 1);
                  } else {
                    setIsBookingOpen(false);
                  }
                }}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                <ChevronLeft size={14} /> Back
              </button>

              <button 
                onClick={() => {
                  if (bookingStep === 1) {
                    handleNextToStep2();
                  } else if (bookingStep === 2) {
                    if (!bookingModel.trim() || !bookingNumber.trim()) {
                      alert('Please specify vehicle model and registration number.');
                      return;
                    }
                    setBookingStep(3);
                  } else if (bookingStep === 3) {
                    if (bookingProblems.length === 0 && !bookingCustomDesc.trim()) {
                      alert('Please choose or describe at least one problem.');
                      return;
                    }
                    setBookingStep(4);
                  } else if (bookingStep === 4) {
                    setBookingStep(5);
                  } else if (bookingStep === 5) {
                    setBookingStep(6);
                  } else {
                    handleWizardBook();
                  }
                }}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 'bold' }}
              >
                {bookingStep === 6 ? 'Confirm Booking' : 'Next'} <ChevronRight size={14} />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
