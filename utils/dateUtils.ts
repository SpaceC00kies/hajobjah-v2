
export const isDateInPast = (date: string | Date | undefined | null): boolean => {
    if (!date) return false;
    return new Date(date as string) < new Date();
};

export const calculateHoursRemaining = (dateValue: string | Date | undefined): number => {
    if (!dateValue) return 0;
    const futureDate = new Date(dateValue);
    const now = new Date();
    const diffMillis = futureDate.getTime() - now.getTime();
    if (diffMillis <= 0) return 0;
    return diffMillis / (1000 * 60 * 60);
};

export const calculateDaysRemaining = (dateValue: string | Date | undefined): number => {
    const hoursRemaining = calculateHoursRemaining(dateValue);
    if (hoursRemaining <= 0) return 0;
    return Math.ceil(hoursRemaining / 24);
};

export const formatDateDisplay = (dateInput?: string | Date | null): string => {
  if (dateInput === null || dateInput === undefined) {
    return 'N/A';
  }
  let dateObject: Date;
  if (dateInput instanceof Date) {
    dateObject = dateInput;
  } else if (typeof dateInput === 'string') {
    dateObject = new Date(dateInput);
  } else {
    // Handling Firestore Timestamp objects if they come through
    if (typeof dateInput === 'object' && dateInput && 'toDate' in dateInput && typeof (dateInput as any).toDate === 'function') {
      dateObject = (dateInput as any).toDate();
    } else {
      console.warn("formatDateDisplay received unexpected dateInput type:", dateInput);
      return "Invalid date input";
    }
  }
  if (isNaN(dateObject.getTime())) {
    return 'Invalid Date';
  }
  try {
    return dateObject.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Error Formatting Date';
  }
};
