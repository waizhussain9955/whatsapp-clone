import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Edit2, Check } from 'lucide-react';

interface ProfileSettingsProps {
  userProfile: { id: string; name: string; avatarUrl: string; about: string };
  onClose: () => void;
  onUpdateProfile: (updates: { name?: string; about?: string; avatarUrl?: string }) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ userProfile, onClose, onUpdateProfile }) => {
  const [name, setName] = useState(userProfile.name);
  const [about, setAbout] = useState(userProfile.about);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateProfile({ avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = () => {
    onUpdateProfile({ name });
    setIsEditingName(false);
  };

  const handleSaveAbout = () => {
    onUpdateProfile({ about });
    setIsEditingAbout(false);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--panel-background)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      <div className="app-bar" style={{ height: '108px', alignItems: 'flex-end', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '24px' }} onClick={onClose}>
          <ArrowLeft size={24} />
          <span style={{ fontSize: '20px', fontWeight: 600 }}>Profile</span>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--background-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0', backgroundColor: 'var(--panel-background)', marginBottom: '12px' }}>
          <div style={{ position: 'relative', width: 200, height: 200, cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            <img src={userProfile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'var(--primary-color)', padding: 12, borderRadius: '50%', color: 'white', display: 'flex' }}>
              <Camera size={24} />
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--panel-background)', padding: '14px 30px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, color: 'var(--primary-color)', marginBottom: 14 }}>Your name</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {isEditingName ? (
              <div style={{ display: 'flex', flex: 1, borderBottom: '2px solid var(--primary-color)', paddingBottom: 4 }}>
                <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 17, color: 'var(--text-primary)' }} />
                <Check size={24} color="var(--primary-color)" style={{ cursor: 'pointer' }} onClick={handleSaveName} />
              </div>
            ) : (
              <>
                <div style={{ fontSize: 17, color: 'var(--text-primary)' }}>{userProfile.name}</div>
                <Edit2 size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} onClick={() => setIsEditingName(true)} />
              </>
            )}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 14 }}>
            This is not your username or pin. This name will be visible to your WhatsApp contacts.
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--panel-background)', padding: '14px 30px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, color: 'var(--primary-color)', marginBottom: 14 }}>About</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {isEditingAbout ? (
              <div style={{ display: 'flex', flex: 1, borderBottom: '2px solid var(--primary-color)', paddingBottom: 4 }}>
                <input autoFocus type="text" value={about} onChange={(e) => setAbout(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 17, color: 'var(--text-primary)' }} />
                <Check size={24} color="var(--primary-color)" style={{ cursor: 'pointer' }} onClick={handleSaveAbout} />
              </div>
            ) : (
              <>
                <div style={{ fontSize: 17, color: 'var(--text-primary)' }}>{userProfile.about}</div>
                <Edit2 size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} onClick={() => setIsEditingAbout(true)} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
