import React from 'react';
import { Patient } from '../types';
import { User, MapPin, ChevronRight, Activity } from 'lucide-react';

interface PatientListProps {
  patients: Patient[];
  onSelect: (patient: Patient) => void;
}

const PatientList: React.FC<PatientListProps> = ({ patients, onSelect }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {patients.map((patient) => (
        <button
          key={patient.id}
          onClick={() => onSelect(patient)}
          className="flex flex-col text-left bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all group"
        >
          <div className="flex justify-between items-start w-full mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">{patient.name}</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{patient.age}歳 / {patient.gender}</span>
              </div>
            </div>
            <ChevronRight className="text-slate-300 group-hover:text-teal-500" />
          </div>
          
          <div className="w-full space-y-2">
             <div className="flex items-start gap-2 text-sm text-slate-600">
               <MapPin size={16} className="mt-0.5 text-slate-400 shrink-0" />
               <span className="line-clamp-1">{patient.address}</span>
             </div>
             <div className="flex items-start gap-2 text-sm text-slate-600">
               <Activity size={16} className="mt-0.5 text-slate-400 shrink-0" />
               <span className="line-clamp-2">{patient.condition}</span>
             </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 w-full flex justify-between items-center">
            <span className="text-xs font-medium text-teal-600">訪問記録を作成</span>
            <span className="text-xs text-slate-400">ID: {patient.id}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default PatientList;
