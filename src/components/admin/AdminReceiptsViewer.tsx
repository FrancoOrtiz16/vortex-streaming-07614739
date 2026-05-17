import { useState, useEffect } from 'react';
import { AlertCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReceiptImageViewer from './ReceiptImageViewer';

interface ReceiptRecord {
  userId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  size: number;
}

/**
 * AdminReceiptsViewer
 * 
 * Panel administrativo para revisar comprobantes de pago subidos.
 * Características:
 * - Lista todos los comprobantes por usuario
 * - Vista previa con manejo de errores 404
 * - Reintentos automáticos si la URL falla
 * - Fallback elegante si el bucket no está disponible
 */
export function AdminReceiptsViewer() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Intentar listar archivos en el bucket 'receipts'
      const { data, error: listError } = await supabase.storage
        .from('receipts')
        .list();

      if (listError) {
        console.error('[AdminReceipts] List error:', listError);
        if (listError.message?.includes('not found')) {
          setError('El bucket de almacenamiento "receipts" no existe o no está configurado correctamente.');
        } else {
          setError(`Error al cargar comprobantes: ${listError.message}`);
        }
        return;
      }

      if (!data || data.length === 0) {
        setReceipts([]);
        return;
      }

      // Mapear archivos a URLs públicas
      const receiptsData: ReceiptRecord[] = data
        .filter(file => !file.name.startsWith('.'))
        .map(file => {
          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(file.name);

          return {
            userId: file.name.split('/')[0] || 'unknown',
            fileName: file.name.split('/')[1] || file.name,
            fileUrl: urlData.publicUrl,
            uploadedAt: file.updated_at || new Date().toISOString(),
            size: file.metadata?.size || 0,
          };
        });

      setReceipts(receiptsData);
    } catch (err: any) {
      console.error('[AdminReceipts] Error:', err);
      setError(err.message || 'Error desconocido al cargar comprobantes');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (isoString: string): string => {
    try {
      return new Date(isoString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Cargando comprobantes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">Error al cargar comprobantes</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <button
              onClick={loadReceipts}
              className="mt-3 text-xs px-3 py-1 rounded bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="rounded-lg bg-secondary/20 border border-dashed border-muted-foreground/30 p-8 text-center">
        <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-muted-foreground">No hay comprobantes subidos aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Comprobantes de Pago ({receipts.length})</h3>
        <button
          onClick={loadReceipts}
          className="text-xs px-3 py-1 rounded border border-border hover:bg-secondary transition-colors"
        >
          Refrescar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {receipts.map((receipt, idx) => (
          <div
            key={`${receipt.userId}-${idx}`}
            className="rounded-lg border border-border overflow-hidden bg-card"
          >
            {/* Vista previa de imagen con manejo de errores */}
            <div className="bg-secondary/10 p-3 aspect-square overflow-hidden">
              <ReceiptImageViewer
                receiptUrl={receipt.fileUrl}
                altText={receipt.fileName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Información del archivo */}
            <div className="p-3 space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Usuario ID</p>
                <p className="font-mono text-xs break-all">{receipt.userId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Archivo</p>
                <p className="truncate">{receipt.fileName}</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-muted-foreground">Tamaño</p>
                  <p>{formatFileSize(receipt.size)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Fecha</p>
                  <p>{formatDate(receipt.uploadedAt)}</p>
                </div>
              </div>
              <a
                href={receipt.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
              >
                Ver a tamaño completo
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminReceiptsViewer;
