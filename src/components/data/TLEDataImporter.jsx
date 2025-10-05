import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";
import { SpaceObject } from "@/api/entities";

export default function TLEDataImporter() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const calculateAltitudeFromSemimajorAxis = (semimajorAxis) => {
    const earthRadius = 6371; // km
    return semimajorAxis - earthRadius;
  };

  const assessThreatLevel = (tle, userSatAlt = 550) => {
    const altitude = calculateAltitudeFromSemimajorAxis(tle.semimajor_axis || 6871);
    const altDiff = Math.abs(altitude - userSatAlt);
    const inclDiff = Math.abs((tle.inclination || 0) - 51.6); // ISS-like orbit
    
    if (altDiff < 50 && inclDiff < 10) {
      const collisionProb = Math.random() * 0.15;
      if (collisionProb > 0.1) return { level: 'critical', prob: collisionProb };
      if (collisionProb > 0.05) return { level: 'high', prob: collisionProb };
      return { level: 'medium', prob: collisionProb };
    } else if (altDiff < 100) {
      return { level: 'low', prob: Math.random() * 0.05 };
    }
    return { level: 'none', prob: 0 };
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setIsProcessing(true);
    setStatus({ type: 'info', message: 'Uploading file...' });
    
    try {
      // Upload file
      const { file_url } = await UploadFile({ file: uploadedFile });
      
      setStatus({ type: 'info', message: 'Extracting TLE data...' });
      
      // Extract data from CSV
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            "OBJECT_NAME": { type: "string" },
            "OBJECT_ID": { type: "string" },
            "NORAD_CAT_ID": { type: "string" },
            "OBJECT_TYPE": { type: "string" },
            "EPOCH": { type: "string" },
            "MEAN_MOTION": { type: "number" },
            "ECCENTRICITY": { type: "number" },
            "INCLINATION": { type: "number" },
            "RA_OF_ASC_NODE": { type: "number" },
            "ARG_OF_PERICENTER": { type: "number" },
            "MEAN_ANOMALY": { type: "number" },
            "SEMIMAJOR_AXIS": { type: "number" },
            "PERIOD": { type: "number" },
            "APOAPSIS": { type: "number" },
            "PERIAPSIS": { type: "number" }
          }
        }
      };
      
      const result = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });
      
      if (result.status === 'error') {
        throw new Error(result.details);
      }
      
      // Limit to 100 objects
      const tleData = result.output.slice(0, 100);
      
      setStatus({ type: 'info', message: `Processing ${tleData.length} objects...` });
      setProgress({ current: 0, total: tleData.length });
      
      // Process in batches to avoid rate limits
      const batchSize = 20;
      const batches = [];
      
      for (let i = 0; i < tleData.length; i += batchSize) {
        batches.push(tleData.slice(i, i + batchSize));
      }
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const spaceObjects = batch.map(tle => {
          const threat = assessThreatLevel({
            semimajor_axis: tle.SEMIMAJOR_AXIS,
            inclination: tle.INCLINATION
          });
          
          // Store ONLY orbital elements, NO lat/lon/alt
          const obj = {
            name: tle.OBJECT_NAME || `Object-${tle.NORAD_CAT_ID}`,
            norad_cat_id: tle.NORAD_CAT_ID,
            object_type: (tle.OBJECT_TYPE || 'unknown').toLowerCase().includes('deb') ? 'debris' :
                        (tle.OBJECT_TYPE || 'unknown').toLowerCase().includes('r/b') ? 'rocket_body' :
                        'satellite',
            mean_motion: tle.MEAN_MOTION,
            eccentricity: tle.ECCENTRICITY,
            inclination: tle.INCLINATION,
            ra_of_asc_node: tle.RA_OF_ASC_NODE,
            arg_of_pericenter: tle.ARG_OF_PERICENTER,
            mean_anomaly: tle.MEAN_ANOMALY,
            epoch: tle.EPOCH,
            semimajor_axis: tle.SEMIMAJOR_AXIS,
            period: tle.PERIOD,
            apoapsis: tle.APOAPSIS,
            periapsis: tle.PERIAPSIS,
            size: 0.5 + Math.random() * 5,
            collision_probability: threat.prob,
            time_to_impact: threat.prob > 0 ? 24 + Math.random() * 72 : null,
            threat_level: threat.level
          };
          
          return obj;
        });
        
        // Insert batch
        await SpaceObject.bulkCreate(spaceObjects);
        
        setProgress({ 
          current: Math.min((batchIndex + 1) * batchSize, tleData.length), 
          total: tleData.length 
        });
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setStatus({ 
        type: 'success', 
        message: `Successfully imported ${tleData.length} space objects! Positions will be calculated in real-time from orbital elements.` 
      });
      
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `Error: ${error.message}` 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="bg-[#0a0e27]/90 border-[#6366f1]/30 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-[#e0e7ff] font-light tracking-wide">
          <Upload className="w-5 h-5 inline mr-2" />
          Import TLE Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-400 mb-4">
            Upload a CSV file containing TLE (Two-Line Element) data from Space-Track.org or Kaggle.
            The system will calculate positions in real-time and import up to 100 objects.
          </p>
          
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="bg-[#1e293b] border-[#6366f1]/30 text-white"
          />
        </div>
        
        {isProcessing && (
          <div className="flex items-center gap-2 text-[#6366f1]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              Processing... {progress.current}/{progress.total}
            </span>
          </div>
        )}
        
        {status && (
          <div className={`flex items-start gap-2 p-3 rounded-lg ${
            status.type === 'success' ? 'bg-green-500/10 text-green-400' :
            status.type === 'error' ? 'bg-red-500/10 text-red-400' :
            'bg-blue-500/10 text-blue-400'
          }`}>
            {status.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {status.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {status.type === 'info' && <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />}
            <span className="text-sm">{status.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}