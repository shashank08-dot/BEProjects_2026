
import React from 'react';
import { Doctor } from '../../types';
import { Stethoscope, MapPin, Phone, Globe } from 'lucide-react';

const DoctorCard: React.FC<{ doctor: Doctor }> = ({ doctor }) => {
  return (
    <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:border-l-4 border-teal-500">
      <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6">
        <div className="flex-shrink-0 mb-4 sm:mb-0">
          <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
            <Stethoscope size={32} className="text-teal-500" />
          </div>
        </div>
        <div className="flex-grow">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">{doctor.name}</h3>
          <p className="text-teal-600 dark:text-teal-400 font-medium">{doctor.specialty}</p>
          <div className="mt-4 space-y-2 text-slate-600 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              <MapPin size={16} />
              <span>{doctor.address}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone size={16} />
              <a href={`tel:${doctor.phone}`} className="hover:text-teal-500">{doctor.phone}</a>
            </div>
            {doctor.website && (
              <div className="flex items-center space-x-2">
                <Globe size={16} />
                <a 
                  href={doctor.website.startsWith('http') ? doctor.website : `https://${doctor.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-teal-500 truncate"
                >
                  {doctor.website}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;
