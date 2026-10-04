import { exportService } from '../services/export/exportService.js';

function send(res, file) {
  res.setHeader('Content-Type', file.mime);
  res.setHeader('Content-Disposition', file.disposition);
  res.send(file.buffer);
}

const baseUrlOf = (req) => `${req.protocol}://${req.get('host')}`;

export const exportController = {
  async exportMany(req, res) {
    send(res, await exportService.exportMany(req.user, req.body.ids, req.params.format, { baseUrl: baseUrlOf(req) }));
  },

  /** Streams the rendered file; errors still go through the JSON envelope. */
  async export(req, res) {
    send(res, await exportService.export(req.user, req.params.id, req.params.format, { baseUrl: baseUrlOf(req) }));
  },
};
