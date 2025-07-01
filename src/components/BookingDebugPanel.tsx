import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { compareSlotFetchVsBooking } from '@/utils/bookingDebugger';

interface BookingDebugPanelProps {
  serviceId: string;
  providerId: string | null;
  date: Date;
  timeSlot: string;
}

function BookingDebugPanel({
  serviceId,
  providerId,
  date,
  timeSlot,
}: BookingDebugPanelProps) {
  const [debugResult, setDebugResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDebugAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await compareSlotFetchVsBooking(
        serviceId,
        providerId,
        date.toISOString().split('T')[0],
        timeSlot
      );
      setDebugResult(result);
    } catch (error) {
      console.error('Debug analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800">🐛 Booking Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Service ID:</strong> {serviceId}
          </div>
          <div>
            <strong>Provider ID:</strong> {providerId || 'None'}
          </div>
          <div>
            <strong>Date:</strong> {date.toISOString().split('T')[0]}
          </div>
          <div>
            <strong>Time Slot:</strong> {timeSlot}
          </div>
        </div>

        <Button onClick={runDebugAnalysis} disabled={isLoading} className="w-full">
          {isLoading ? 'Running Debug Analysis...' : 'Run Debug Analysis'}
        </Button>

        {debugResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-2 rounded ${debugResult.analysis.slotShownAsAvailable ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>Slot Available in RPC:</strong> {debugResult.analysis.slotShownAsAvailable ? '✅ Yes' : '❌ No'}
              </div>
              <div className={`p-2 rounded ${debugResult.analysis.allSlotsValid ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>All Slots Valid:</strong> {debugResult.analysis.allSlotsValid ? '✅ Yes' : '❌ No'}
              </div>
            </div>

            {debugResult.analysis.failureReasons.length > 0 && (
              <div className="bg-red-100 p-3 rounded">
                <strong>Failure Reasons:</strong>
                <ul className="list-disc ml-4 mt-2">
                  {debugResult.analysis.failureReasons.map((reason: any, index: number) => (
                    <li key={index}>
                      <strong>{reason.slot}:</strong>
                      {reason.providerIssue && ' Provider unavailable'}
                      {reason.showerIssue && ' Shower unavailable'}
                      {reason.conflictIssue && ` ${reason.conflicts.length} conflicts`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Textarea
              value={JSON.stringify(debugResult, null, 2)}
              readOnly
              rows={10}
              className="font-mono text-xs"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BookingDebugPanel;
