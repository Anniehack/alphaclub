

import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'obc';

export type Unit = {
  type: string;
  plateNumber: string;
};

export type BankDetails = {
    bankName: string;
    iban: string;
    swift: string;
};

export type UserComment = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Timestamp | string; // Allow both for sending and receiving
}

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  obcNumber?: string;
  registrationStatus?: 'pending' | 'approved';
  availability?: 'Available' | 'Busy' | 'Unavailable';
  currentLocation?: string;
  specialization?: string;
  passportExpiry?: string;
  visaExpiry?: string;
  location?: { lat: number; lng: number } | null;
  fcmTokens?: string[]; // For push notifications

  // New registration fields
  address?: string;
  mobileNumber?: string;
  baseCity?: string;
  airlineLoyaltyPrograms?: Array<{ airline: string; programNumber: string; status: string; }>;
  creditCardLimit?: number;
  units?: Unit[];
  rfc?: string;
  bankDetails?: BankDetails;
};

export type MissionStatus = 'Pending' | 'Booked' | 'Completed' | 'Canceled' | 'Postponed' | 'Lost' | 'Paid';

export type MissionTimelineStage = {
  stage: string; // The unique name of the stage, e.g., "Received goods"
  label: string; // The user-facing label for the stage
  timestamp: string | null;
  completed: boolean;
  location: { lat: number; lng: number } | null;
  // Add fields for the data associated with actions
  amountOfBoxes?: number;
  photoUrls?: string[];
  attachmentUrls?: string[];
  eta?: string; // ISO string
  podUrl?: string;
};

export type Mission = {
  id: string;
  title: string;
  origin: string;
  destination?: string;
  description?: string;
  obcAmount?: number;
  missionDate?: string;
  serviceType?: Array<'OBC' | 'First Mile' | 'Last Mile'>;
  obcIds?: string[];
  createdBy?: string; // Admin who created the mission
  status: MissionStatus;
  lostReason?: string;
  timeline: MissionTimelineStage[];
  amountOfBoxes?: number;
  routingInfo?: string;
  serviceOrder?: string;
  attachments?: {
    planeTicketUrl?: string;
    hotelUrl?: string;
  };
};

export type OBC = User & {
  obcId: string;
};

export type DocumentType = 'Passport' | 'Visa' | 'DriversLicense' | 'GlobalEntry' | 'APEC';

export type UserDocument = {
  id?: string;
  type: DocumentType;
  country?: string;
  expiryDate: string;
  image?: string;
};

export type InviteCode = {
  code: string;
  email: string;
  isUsed: boolean;
  createdAt: string;
};

export type MissionApplication = {
  id: string;
  missionId: string;
  missionTitle: string;
  serviceType: Array<'OBC' | 'First Mile' | 'Last Mile'>;
  obcId: string;
  obcName: string;
  obcNumber: string;
  applicationDate: string;
  status: 'pending' | 'approved' | 'rejected';
};

// Expense Report Types
export type ExpenseCategory = 'Cart' | 'Excess baggage' | 'CBP Tax' | 'Car Rental' | 'Hotel' | 'Wrapping fee' | 'Taxi/Uber Fee' | 'Flight Charges' | 'Duty Fees' | 'Transfer' | 'Other';
export type Currency = 'USD' | 'MXN';

export type ExpenseItem = {
    category: ExpenseCategory;
    amount: number;
    currency: Currency;
    receiptUrl: string;
};

export type ExpenseReport = {
    id: string;
    missionId: string;
    missionTitle: string;
    obcId: string;
    obcName: string;
    submittedAt: string;
    items: ExpenseItem[];
    totalAmount: number;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
    approvedAt?: string;
    invoiceUrl?: string;
    finalAmount?: number;
    finalCurrency?: Currency;
};

// Notification Types
export type NotificationType = 'expense_approved' | 'expense_submitted' | 'invoice_submitted' | 'generic' | 'mission_update' | 'expense_paid';

export type Notification = {
  id: string;
  message: string;
  type: NotificationType;
  relatedId: string; // e.g., expenseReportId
  read: boolean;
  createdAt: string; // ISO String
};


// Chat Types
export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string; // ISO String
  imageUrl?: string;
};

export type Conversation = {
  id: string;
  missionId: string;
  missionTitle: string;
  participantIds: string[];
  participants: {
    [key: string]: {
      id: string;
      name: string;
      avatar: string;
      role: UserRole;
    }
  };
  lastMessage?: {
    text: string;
    timestamp: string; // ISO String
  }
};
