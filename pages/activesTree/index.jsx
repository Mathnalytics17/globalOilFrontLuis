import { useState, useEffect } from 'react';
import { FiSettings, FiMoreVertical } from 'react-icons/fi';
import ActivesTreeIndex from '@features/asset-tree/presentation/AssetTreePage';
import { Card, Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

const ActivesTreeApp = () => {
  return (
    <div>
      
        <ActivesTreeIndex />
    </div>
  );
};

export default ActivesTreeApp;
