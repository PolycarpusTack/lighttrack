import React from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import ManualEntryModal from './ManualEntryModal';
import EditActivityModal from './EditActivityModal';
import ConfirmationModal from './ConfirmationModal';
import SplitActivityModal from './SplitActivityModal';
import ExportModal from './ExportModal';
import BulkCategorizeModal from './BulkCategorizeModal';

const ModalManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { modals } = useAppSelector(state => state.ui);

  const handleCloseModal = (modalId: string) => {
    dispatch(closeModal(modalId));
  };

  return (
    <>
      {modals.map(modal => {
        const isOpen = true;
        const onClose = () => handleCloseModal(modal.id);

        switch (modal.type) {
          case 'manualEntry':
            return (
              <ManualEntryModal
                key={modal.id}
                isOpen={isOpen}
                onClose={onClose}
              />
            );

          case 'editActivity':
            if (!modal.data?.activity) return null;
            return (
              <EditActivityModal
                key={modal.id}
                isOpen={isOpen}
                onClose={onClose}
                activity={modal.data.activity}
              />
            );

          case 'confirmation':
            if (!modal.data) return null;
            return (
              <ConfirmationModal
                key={modal.id}
                isOpen={isOpen}
                onClose={onClose}
                data={modal.data}
              />
            );

          case 'splitActivity':
            if (!modal.data?.activity) return null;
            return (
              <SplitActivityModal
                key={modal.id}
                isOpen={isOpen}
                onClose={onClose}
                activity={modal.data.activity}
              />
            );

          case 'export':
            if (!modal.data?.activityIds) return null;
            return (
              <ExportModal
                key={modal.id}
                isOpen={isOpen}
                onClose={onClose}
                activityIds={modal.data.activityIds}
              />
            );

          case 'bulkCategorize':
            if (!modal.data?.activityIds) return null;
            return (
              <BulkCategorizeModal
                key={modal.id}
                isOpen={isOpen}
                onClose={onClose}
                activityIds={modal.data.activityIds}
              />
            );

          default:
            return null;
        }
      })}
    </>
  );
};

export default ModalManager;