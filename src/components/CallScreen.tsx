import React from 'react';
import { PhoneOff, Video, Phone } from 'lucide-react';

interface CallScreenProps {
  isReceivingCall: boolean;
  callerName: string;
  isCallAccepted: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  callType: 'video' | 'audio';
}

const CallScreen: React.FC<CallScreenProps> = ({
  isReceivingCall,
  callerName,
  isCallAccepted,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onReject,
  onEndCall,
  callType,
}) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: '#111', color: 'white', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Remote Video (Full Screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          display: isCallAccepted && callType === 'video' ? 'block' : 'none'
        }}
      />

      {/* Local Video (Picture-in-Picture) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute', top: 20, right: 20, width: '100px', height: '150px',
          objectFit: 'cover', borderRadius: '8px', border: '2px solid white',
          display: callType === 'video' ? 'block' : 'none'
        }}
      />

      {/* Audio Only Placeholder */}
      {callType === 'audio' && (
        <div style={{ position: 'absolute', top: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Phone size={48} />
          </div>
          <h2>{callerName}</h2>
          <p>{isCallAccepted ? '00:00' : 'Ringing...'}</p>
        </div>
      )}

      {/* Overlay UI */}
      {(!isCallAccepted && isReceivingCall) && callType === 'video' && (
        <div style={{ position: 'absolute', top: '20%', textAlign: 'center' }}>
          <h2>{callerName}</h2>
          <p>Incoming Video Call...</p>
        </div>
      )}

      {/* Controls */}
      <div style={{ position: 'absolute', bottom: 40, display: 'flex', gap: 30 }}>
        {!isCallAccepted && isReceivingCall ? (
          <>
            <button onClick={onReject} style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'red', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneOff size={24} />
            </button>
            <button onClick={onAccept} style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'green', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={24} />
            </button>
          </>
        ) : (
          <button onClick={onEndCall} style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'red', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PhoneOff size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CallScreen;
