const nodemailer = require('nodemailer') as any;

export class ViaCepApi {
  async buscar(cep: string): Promise<unknown> {
    const clean = cep.replace(/\D/g, '');
    if (!/^\d{8}$/.test(clean)) throw new Error('CEP deve conter 8 números.');
    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`, { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error('ViaCEP indisponível.');
    const data = await response.json() as { erro?: boolean };
    if (data.erro) throw new Error('CEP não encontrado.');
    return data;
  }
}

export class WeatherApi {
  async previsao(location: string, date: string): Promise<unknown> {
    if (!/^[\w\sÀ-ÿ,.'-]{2,120}$/u.test(location) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Cidade ou data inválida.');
    const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=pt&format=json`, { signal: AbortSignal.timeout(9000) });
    if (!geoResponse.ok) throw new Error('Geolocalização indisponível.');
    const geo = await geoResponse.json() as any;
    if (!geo.results?.length) throw new Error('Cidade não encontrada.');
    const place = geo.results[0];
    const target = new Date(`${date}T12:00:00`);
    const diff = Math.ceil((target.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
    if (diff < 0 || diff > 15) return { unavailable: true, message: 'Previsão disponível apenas para os próximos 16 dias.' };
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=16`, { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error('Open-Meteo indisponível.');
    const data = await response.json() as any;
    const i = data.daily.time.indexOf(date);
    if (i < 0) return { unavailable: true, message: 'Previsão ainda não disponível para esta data.' };
    return { cidade: `${place.name}, ${place.country}`, data: date, max: data.daily.temperature_2m_max[i], min: data.daily.temperature_2m_min[i], chuva: data.daily.precipitation_probability_max[i], codigo: data.daily.weather_code[i] };
  }
}

export class RouteApi {
  async calcular(origem: string, destino: string): Promise<{ distanciaKm: number; duracaoMinutos: number }> {
    const coords = async (address: string) => {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, { headers: { 'User-Agent': 'BuffetManager/1.0' }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error('Geocodificação indisponível.');
      const data = await r.json() as Array<{ lat: string; lon: string }>;
      if (!data.length) throw new Error(`Endereço não encontrado: ${address}`);
      return `${data[0].lon},${data[0].lat}`;
    };
    const a = await coords(origem);
    await new Promise(resolve => setTimeout(resolve, 1100)); // Respeita a política de uso do Nominatim público
    const b = await coords(destino);
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a};${b}?overview=false`, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error('OSRM indisponível.');
    const data = await r.json() as any;
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('Não foi possível calcular a rota.');
    return { distanciaKm: Math.round(data.routes[0].distance / 10) / 100, duracaoMinutos: Math.round(data.routes[0].duration / 60) };
  }
}

export class EmailService {
  async enviar(to: string, subject: string, body: string): Promise<boolean> {
    if (typeof subject !== 'string' || subject.length > 250 || typeof body !== 'string' || body.length > 7000) throw new Error('Assunto ou conteúdo do e-mail inválido.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('E-mail destinatário inválido.');
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Buffet Manager <onboarding@resend.dev>', to: [to], subject, text: body }), signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Falha no Resend: ${await response.text()}`);
      return true;
    }
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) throw new Error('Configure Resend ou SMTP no arquivo .env para enviar e-mails reais.');
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
    await transporter.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, text: body });
    return true;
  }
}
