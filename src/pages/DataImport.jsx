
import React from 'react';
import TLEDataImporter from '../components/data/TLEDataImporter';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DataImport() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0a0e27] to-[#1e1b4b] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <Link 
          to={createPageUrl('SpaceDefense')}
          className="inline-flex items-center gap-2 text-[#6366f1] hover:text-[#a855f7] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to NOVA
        </Link>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] mb-2">
            TLE Data Import
          </h1>
          <p className="text-gray-400 font-light">
            Import real satellite tracking data from Space-Track.org or Kaggle datasets
          </p>
        </div>
        
        <TLEDataImporter />
        
        <div className="mt-8 p-6 bg-[#0a0e27]/90 border border-[#6366f1]/30 rounded-xl">
          <h3 className="text-lg font-semibold text-[#e0e7ff] mb-4">How to use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
            <li>Download TLE data from Space-Track.org or Kaggle (CSV format)</li>
            <li>Upload the CSV file using the form above</li>
            <li>The system will automatically:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Extract orbital elements (MEAN_MOTION, INCLINATION, etc.)</li>
                <li>Calculate positions in real-time from orbital mechanics</li>
                <li>Assess threat levels based on orbital proximity</li>
                <li>Import up to 100 objects for optimal performance</li>
              </ul>
            </li>
            <li>Return to the main NOVA dashboard to view the imported objects</li>
            <li>Positions update every second based on real orbital calculations</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
