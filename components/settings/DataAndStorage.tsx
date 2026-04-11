enum StorageProvider {
  LocalStorage = "Local Storage",
  CloudStorage = "Cloud Storage",
  ExternalDrive = "External Drive",
}

export  interface IDataAndStorage{
  providerName: StorageProvider;
  AdvanceSecurity: "on"| "off";
  is2MFAEnabled: boolean;
  availableStorage: string;
  totalStorageUesAlloted: string;
  storageUsed: string;
}

export function DataAndStorage() {
  return (
    <div>
      <h1>Data & Storage</h1>
      <p>Manage your data and storage settings here.</p>


    </div>
  );
}
