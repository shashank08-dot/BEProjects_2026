
import React, { useState, useEffect } from 'react';
import { getCurrentLocation } from '../../services/locationService';
import { findNearbyDoctors } from '../../services/geminiService';
import { Doctor } from '../../types';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import DoctorCard from './DoctorCard';
import { MapPin } from 'lucide-react';

const FindDoctors: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionRequested, setPermissionRequested] = useState(false);

  const fetchDoctors = async () => {
    setIsLoading(true);
    setError('');
    setPermissionRequested(true);
    try {
      const { lat, lon } = await getCurrentLocation();
      const fetchedDoctors = await findNearbyDoctors(lat, lon);
      setDoctors(fetchedDoctors);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // This effect is not used to call fetchDoctors to avoid running on mount
  // It only exists to show how a manual trigger is implemented.
  useEffect(() => {
    // This effect can be used for other side-effects if needed.
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">Find a Mental Health Professional</h1>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Discover specialists near you to support your wellness journey.
        </p>
      </div>

      {!permissionRequested && (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md">
            <MapPin size={48} className="text-teal-500 mb-4"/>
            <h2 className="text-xl font-semibold mb-2">We need your location to find doctors nearby.</h2>
            <p className="text-slate-500 mb-6 text-center">Your location is only used to find local professionals and is not stored.</p>
            <Button onClick={fetchDoctors} isLoading={isLoading}>
                Allow Location Access
            </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center h-64">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-500">Searching for doctors near you...</p>
        </div>
      )}

      {error && (
        <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && doctors.length > 0 && (
        <div className="space-y-4">
          {doctors.map((doctor, index) => (
            <DoctorCard key={index} doctor={doctor} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FindDoctors;
