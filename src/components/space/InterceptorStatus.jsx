import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, CheckCircle, AlertCircle, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InterceptorAction } from "@/api/entities";

export default function InterceptorStatus({ interceptors, onRefresh }) {
  const getStatusIcon = (status) => {
    switch(status) {
      case 'deployed': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'approaching': return <Rocket className="w-4 h-4 text-yellow-400" />;
      case 'intercept_successful': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'intercept_failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'deployed': return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'approaching': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'intercept_successful': return 'bg-green-500/20 text-green-400 border-green-500';
      case 'intercept_failed': return 'bg-red-500/20 text-red-400 border-red-500';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  const handleCancel = async (interceptorId) => {
    try {
      await InterceptorAction.delete(interceptorId);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Failed to cancel interceptor:', error);
    }
  };

  return (
    <Card className="bg-[#0a0e27]/90 border-[#6366f1]/30 backdrop-blur-xl">
      <CardHeader className="border-b border-[#6366f1]/20">
        <CardTitle className="flex items-center gap-2 text-[#e0e7ff] font-light tracking-wide">
          <Rocket className="w-5 h-5 text-[#6366f1]" />
          INTERCEPTOR STATUS
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {interceptors.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Rocket className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active interceptors</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interceptors.map((interceptor) => (
              <div
                key={interceptor.id}
                className={`p-3 rounded-lg border ${getStatusColor(interceptor.status)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(interceptor.status)}
                    <span className="font-semibold text-sm">{interceptor.target_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-current text-xs py-0">
                      {interceptor.status?.toUpperCase().replace('_', ' ')}
                    </Badge>
                    {(interceptor.status === 'deployed' || interceptor.status === 'approaching') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        onClick={() => handleCancel(interceptor.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {interceptor.status === 'approaching' && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-70">Distance:</span>
                      <span className="font-mono">{interceptor.distance_to_target?.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">ETA:</span>
                      <span className="font-mono">{interceptor.estimated_intercept_time?.toFixed(1)} min</span>
                    </div>
                  </div>
                )}

                {interceptor.status === 'deployed' && (
                  <div className="mt-2 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-70">Deployed:</span>
                      <span className="font-mono">
                        {new Date(interceptor.deployment_time).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}