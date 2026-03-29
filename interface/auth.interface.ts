export interface IMyDetails {
  _id: string;
  userName: string;
  userEmail: string;
  profilePicture?: string;
  location: {
    city?: string;
    country?: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  customId: string;
  createdAt: Date;
}

type NotificationOption = "on" | "off";

export interface INotification {
  userId: string;
  NotificationOptions: {
    pushNotificationToken:NotificationOption;
    camaraAccess:NotificationOption ;
    microphoneAccess:NotificationOption;
    
  };
}
