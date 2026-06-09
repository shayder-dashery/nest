import { SwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerCustomOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true, // mantém o token JWT após atualizar a página
  },

  customCss: `
      .swagger-ui .topbar { background-color: #3182ce; }
      .swagger-ui .opblock .opblock-summary { border-color: #3182ce; }
      .swagger-ui .info h1 { color: #2b6cb0; }
      html.dark-mode .swagger-ui .topbar {
    background: red;
        }
    `, // Adicione seus estilos CSS diretamente aqui
  // customCssUrl: 'https://cloudflare.com', // Ou carregue um CSS externo
  // customJs: [
  //   'https://cloudflare.com',
  // ],
  customfavIcon: '/favicon.ico',
  customSiteTitle: 'Documentação da API - Custom',
};
