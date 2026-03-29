import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X } from "lucide-react";
import Image from "next/image";

interface ImageViewerModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageViewerModal({
  imageUrl,
  isOpen,
  onClose,
}: ImageViewerModalProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full bg-transparent border-none shadow-none flex justify-center items-center p-0">
        <VisuallyHidden>
          <DialogTitle>Profile Picture</DialogTitle>
        </VisuallyHidden>

        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full"
        >
          <X className="w-6 h-6" />
        </button>

        <Image
          src={imageUrl}
          alt="View Fullscreen"
          className="max-w-full max-h-[85vh] object-contain rounded-md"
          width={800}
          height={600}
        />
      </DialogContent>
    </Dialog>
  );
}
