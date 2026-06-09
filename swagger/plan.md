# Plan: Swagger UI Sidebar + Tema Dark/Light

## Contexto
- Projeto NestJS com @nestjs/swagger ^11.4.4 (suporta `customJsStr`)
- 6 tags: Página Inicial, Login, Restaurantes, Produtos, Pedidos, Usuários
- Arquivo principal: `/workspace/swagger/swaggerStyle.ts`
- `/workspace/swagger/index.html` existe mas NÃO é usado pelo SwaggerModule.setup — é ignorado
- Opções `customCss` e `customJsStr` são injetadas no template gerado automaticamente pelo NestJS Swagger

## Decisões do usuário
- Tema: dark + light com toggle button
- Sidebar: grupos + endpoints individuais (método + path + summary)
- Comportamento: fixa no desktop, recolhível no mobile (drawer)

## Steps

### Phase 1 — CSS (`customCss`)
1. CSS variables: `html` = light (default), `html.dark-mode` = dark
   - Variáveis: --bg-primary, --bg-secondary, --text-primary, --text-muted, --border-color, --sidebar-bg, --sidebar-hover, --topbar-bg
   - Dark mode override para elementos principais do Swagger UI
2. Sidebar layout: `#api-sidebar` — position fixed, left 0, top 0, width 260px, height 100vh, overflow-y auto
3. Adjust main content: `body #swagger-ui` ou `.swagger-ui .wrapper` com `margin-left: 260px`
4. Sidebar header: logo/título da API + toggle tema (ícone sol/lua)
5. Sidebar tag groups: título do grupo + contador de endpoints
6. Sidebar endpoint items: badge colorido do método (GET/POST/PUT/DELETE/PATCH) + path truncado
7. Active state: border-left highlight no grupo/endpoint ativo
8. HTTP method badge colors:
   - GET: #61affe (azul claro)
   - POST: #49cc90 (verde)
   - PUT: #fca130 (laranja)
   - DELETE: #f93e3e (vermelho)
   - PATCH: #50e3c2 (teal)
9. Mobile (<768px): sidebar hidden por default, translateX(-260px), visível com classe `.sidebar-open`
10. Hamburger button fixo no topo-esquerdo no mobile

### Phase 2 — JavaScript (`customJsStr`)
11. `initTheme()`: ler localStorage `api-theme`, aplicar classe `dark-mode` no `<html>`, padrão = dark
12. `waitForSwagger()`: polling a cada 200ms até `.opblock-tag-section` aparecer no DOM, então chamar `buildSidebar()`
13. `buildSidebar()`:
    - Criar div `#api-sidebar` e prepend ao `body`
    - Header: título "Delivery API" + botão toggle tema (ícone ☀/🌙)
    - Para cada `.opblock-tag-section`:
      - Extrair nome da tag via `.opblock-tag span` (ignorar `<small>`)
      - Contar `.opblock` filhos
      - Para cada `.opblock`: extrair método (classe `opblock-get/post/put/delete/patch`), path (`.opblock-summary-path`), summary (`.opblock-summary-description`)
      - Renderizar `.sidebar-tag` com lista `.sidebar-endpoints`
14. `buildMobileToggle()`: botão hamburguer injetado no body, toggle classe `.sidebar-open`
15. Event handlers:
    - Click em tag: expand/collapse `ul.sidebar-endpoints` + smooth scroll ao grupo
    - Click em endpoint: scroll para o opblock correspondente + abrir se colapsado (simular click)
    - Click no theme toggle: toggle classe `dark-mode` no `<html>` + salvar no localStorage
16. `highlightActive()`: scroll listener no window, detecta qual `.opblock-tag-section` está visível, marca `.active` no sidebar

## Arquivos modificados
- `/workspace/swagger/swaggerStyle.ts` — único arquivo modificado

## Verification
1. `npm run start:dev` e abrir `http://localhost:3000/api/docs`
2. Sidebar visível com 6 grupos (Página Inicial, Login, Restaurantes, Produtos, Pedidos, Usuários)
3. Click em grupo expande lista de endpoints com badges coloridos
4. Click em endpoint faz scroll e abre o opblock
5. Toggle de tema muda visual dark/light e persiste após F5
6. Em viewport <768px: sidebar oculta, botão hamburguer visível
7. Scroll da página atualiza highlight ativo na sidebar
