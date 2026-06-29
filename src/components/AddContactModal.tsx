import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddContactModalProps {
  onClose: () => void;
  onAdd: (contactId: string, contactName: string) => void;
  currentUserPhone: string;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ onClose, onAdd, currentUserPhone }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name) return;
    if (phone === currentUserPhone) {
      alert("You cannot add yourself.");
      return;
    }
    onAdd(phone, name);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--panel-background)', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '400px', boxShadow: '0 17px 50px 0 rgba(11,20,26,.19), 0 12px 15px 0 rgba(11,20,26,.24)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)' }}>Add contact</h2>
          <X size={24} color="var(--text-secondary)" style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--primary-color)' }}>Phone Number / ID</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="e.g. 03001234567" 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: 'none', borderBottom: '2px solid var(--primary-light)', background: 'var(--background-color)', color: 'var(--text-primary)', outline: 'none' }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--primary-color)' }}>Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Contact's Name" 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: 'none', borderBottom: '2px solid var(--primary-light)', background: 'var(--background-color)', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid var(--divider-color)', borderRadius: '24px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
            <button type="submit" disabled={!phone || !name} style={{ padding: '10px 24px', background: 'var(--primary-color)', border: 'none', borderRadius: '24px', color: 'white', cursor: phone && name ? 'pointer' : 'not-allowed', fontWeight: 500, opacity: phone && name ? 1 : 0.5 }}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
