import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as shipmentService from '../services/shipmentService';
import * as hepsijet from '../services/hepsijetService';

// HepsiJET kargo entegrasyonu — admin uçları

/** Sipariş için HepsiJET gönderisi oluşturur. */
export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await shipmentService.createShipment(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** HepsiJET'ten takip bilgisini sorgular ve kaydı günceller. */
export async function refreshTracking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await shipmentService.refreshTracking(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** Kargo etiketini (ZPL) indirir. */
export async function label(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const zpl = await shipmentService.getLabel(String(req.params.id));
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hepsijet-${req.params.id}.zpl"`);
    res.send(zpl);
  } catch (err) {
    next(err);
  }
}

/** İade talebi için HepsiJET iade gönderisi (RETURNED) oluşturur. */
export async function createReturn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await shipmentService.createReturnShipment(String(req.params.returnId));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** İade gönderisinin kargo etiketini (ZPL) indirir. */
export async function returnLabel(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const zpl = await shipmentService.getReturnLabel(String(req.params.returnId));
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hepsijet-iade-${req.params.returnId}.zpl"`);
    res.send(zpl);
  } catch (err) {
    next(err);
  }
}

/** HepsiJET'e gönderilecek payload önizlemesi (hata ayıklama). */
export async function preview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payload = await shipmentService.previewPayload(String(req.params.id));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    next(err);
  }
}

/** ZPL etiketini PNG'ye dönüştürüp döndürür (Labelary API). */
export async function labelPreview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const zpl = await shipmentService.getLabel(String(req.params.id));
    // Labelary POST body = ham ZPL metni (application/x-www-form-urlencoded değil)
    const labelaryRes = await fetch(
      'http://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'image/png' },
        body: zpl,
      },
    );
    if (!labelaryRes.ok) {
      const msg = await labelaryRes.text().catch(() => '');
      return next(Object.assign(new Error(`Labelary servisi hata döndürdü: ${labelaryRes.status} ${msg.slice(0, 200)}`), { status: 502 }));
    }
    const buf = Buffer.from(await labelaryRes.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  } catch (err) {
    next(err);
  }
}

/** İade ZPL etiketini PNG'ye dönüştürüp döndürür (Labelary API). */
export async function returnLabelPreview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const zpl = await shipmentService.getReturnLabel(String(req.params.returnId));
    const labelaryRes = await fetch(
      'http://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'image/png' },
        body: zpl,
      },
    );
    if (!labelaryRes.ok) {
      const msg = await labelaryRes.text().catch(() => '');
      return next(Object.assign(new Error(`Labelary servisi hata döndürdü: ${labelaryRes.status} ${msg.slice(0, 200)}`), { status: 502 }));
    }
    const buf = Buffer.from(await labelaryRes.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  } catch (err) {
    next(err);
  }
}

/** HepsiJET bağlantı testi. */
export async function ping(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await hepsijet.ping();
    res.json({ success: result.ok, data: result });
  } catch (err) {
    next(err);
  }
}
