"use strict";
/**
 * Traffic Light / Semáforo - Sistema de alertas por vencimiento
 * Determina el estado visual según días para vencimiento
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDaysUntilExpiry = getDaysUntilExpiry;
exports.getTrafficLightStatus = getTrafficLightStatus;
exports.getTrafficLightColor = getTrafficLightColor;
exports.getTrafficLightInfo = getTrafficLightInfo;
exports.getExpiryMessage = getExpiryMessage;
var DEFAULT_CONFIG = {
    greenThreshold: 5, // Verde: más de 5 días
    yellowThreshold: 3, // Amarillo: 3 días o menos (alerta)
};
/**
 * Calcula los días restantes hasta el vencimiento
 * @param expiryDate - Fecha de vencimiento (ISO string o Date)
 * @returns Días restantes (negativo si ya venció)
 */
function getVETDateParts(date) {
    var formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    var parts = formatter.formatToParts(date).reduce(function (acc, part) {
        var _a;
        return (__assign(__assign({}, acc), (_a = {}, _a[part.type] = part.value, _a)));
    }, {});
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
    };
}
function getDaysUntilExpiry(expiryDate) {
    if (!expiryDate)
        return -999; // Indefinido, considerar como vencido
    var expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : new Date(expiryDate.getTime());
    if (Number.isNaN(expiry.getTime()))
        return -999;
    var today = new Date();
    var vetExpiry = getVETDateParts(expiry);
    var vetToday = getVETDateParts(today);
    var expiryUtcMidnight = Date.UTC(vetExpiry.year, vetExpiry.month - 1, vetExpiry.day);
    var todayUtcMidnight = Date.UTC(vetToday.year, vetToday.month - 1, vetToday.day);
    var diffTime = expiryUtcMidnight - todayUtcMidnight;
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}
/**
 * Obtiene el estado del semáforo basado en la fecha de vencimiento
 * @param expiryDate - Fecha de vencimiento
 * @param config - Configuración personalizada (opcional)
 * @returns Estado: 'green' | 'yellow' | 'red' | 'expired'
 */
function getTrafficLightStatus(expiryDate, config) {
    if (config === void 0) { config = {}; }
    var mergedConfig = __assign(__assign({}, DEFAULT_CONFIG), config);
    var daysLeft = getDaysUntilExpiry(expiryDate);
    if (daysLeft <= 0) {
        return 'expired'; // Vencido o vence hoy: bloqueo de seguridad
    }
    if (daysLeft > mergedConfig.greenThreshold) {
        return 'green';
    }
    if (daysLeft <= mergedConfig.yellowThreshold) {
        return 'yellow';
    }
    // Entre greenThreshold y yellowThreshold
    return 'yellow';
}
/**
 * Obtiene el color CSS para mostrar el semáforo
 * @param status - Estado del semáforo
 * @returns Clase CSS para aplicar al elemento
 */
function getTrafficLightColor(status) {
    switch (status) {
        case 'green':
            return 'bg-emerald-500/80 text-emerald-100';
        case 'yellow':
            return 'bg-amber-500/80 text-amber-100';
        case 'red':
            return 'bg-red-500/80 text-red-100';
        case 'expired':
            return 'bg-red-600/90 text-red-100';
        default:
            return 'bg-slate-500/50 text-slate-100';
    }
}
/**
 * Obtiene el icono y mensaje descriptivo del semáforo
 * @param status - Estado del semáforo
 * @returns { icon, label, tooltip }
 */
function getTrafficLightInfo(status) {
    switch (status) {
        case 'green':
            return {
                icon: '🟢',
                label: 'Activo',
                tooltip: 'Suscripción vigente - Más de 5 días para vencimiento',
            };
        case 'yellow':
            return {
                icon: '🟡',
                label: 'Alerta',
                tooltip: 'Vencimiento próximo - 3 días o menos',
            };
        case 'red':
            return {
                icon: '🔴',
                label: 'Crítico',
                tooltip: 'Muy próximo al vencimiento - 1-2 días',
            };
        case 'expired':
            return {
                icon: '⚫',
                label: 'Vencido',
                tooltip: 'Suscripción vencida - Requiere renovación',
            };
        default:
            return {
                icon: '⚪',
                label: 'Desconocido',
                tooltip: 'Estado no determinado',
            };
    }
}
/**
 * Formatea un mensaje legible sobre el vencimiento
 * @param expiryDate - Fecha de vencimiento
 * @returns Mensaje descriptivo
 */
function getExpiryMessage(expiryDate) {
    var daysLeft = getDaysUntilExpiry(expiryDate);
    if (daysLeft < 0) {
        return "Vencido hace ".concat(Math.abs(daysLeft), " d\u00EDa(s)");
    }
    if (daysLeft === 0) {
        return 'Vence hoy';
    }
    if (daysLeft === 1) {
        return 'Vence mañana';
    }
    if (daysLeft <= 7) {
        return "Vence en ".concat(daysLeft, " d\u00EDa(s)");
    }
    return "Vence en ".concat(daysLeft, " d\u00EDa(s)");
}
