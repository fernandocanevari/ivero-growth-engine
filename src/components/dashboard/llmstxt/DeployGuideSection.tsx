import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Server, Cloud, Github, FolderUp, Globe } from "lucide-react";

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="font-mono text-xs bg-muted/60 px-1.5 py-0.5 rounded border border-border">{children}</code>
);

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
      {n}
    </span>
    <div className="text-sm text-foreground/90 leading-relaxed pt-0.5">{children}</div>
  </li>
);

export function DeployGuideSection() {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-base font-medium text-foreground">Como subir o llms.txt no seu site</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha sua plataforma abaixo e siga o passo a passo. O arquivo deve ficar acessível em <Code>seudominio.com/llms.txt</Code>.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="wordpress">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2.5">
              <Server className="h-4 w-4 text-primary" />
              <span>WordPress</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="space-y-3 pt-1">
              <Step n={1}>Acesse o painel da sua hospedagem (Hostinger, Kinsta, SiteGround, etc.) e abra o <strong>File Manager</strong>. Se usar hospedagem sem painel próprio, instale o plugin <Code>File Manager</Code> dentro do WordPress.</Step>
              <Step n={2}>Navegue até a pasta raiz do site, geralmente <Code>public_html/</Code> (ou <Code>www/</Code>). É a mesma pasta onde estão arquivos como <Code>wp-config.php</Code> e <Code>index.php</Code>.</Step>
              <Step n={3}>Clique em <strong>Upload</strong> e envie o arquivo <Code>llms.txt</Code> baixado acima.</Step>
              <Step n={4}>Abra <Code>https://seudominio.com/llms.txt</Code> no navegador para confirmar que o arquivo está público.</Step>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vercel">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2.5">
              <Cloud className="h-4 w-4 text-primary" />
              <span>Vercel</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="space-y-3 pt-1">
              <Step n={1}>No seu repositório, coloque o arquivo dentro da pasta <Code>public/</Code> (Vite/React/Next App Router) ou <Code>static/</Code> (frameworks que servem assets estáticos dessa pasta).</Step>
              <Step n={2}>Faça commit e push: <Code>git add public/llms.txt && git commit -m "add llms.txt" && git push</Code>.</Step>
              <Step n={3}>A Vercel fará o deploy automaticamente. Em poucos segundos o arquivo estará em <Code>https://seudominio.com/llms.txt</Code>.</Step>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="netlify">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2.5">
              <Cloud className="h-4 w-4 text-primary" />
              <span>Netlify</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="space-y-3 pt-1">
              <Step n={1}>Se o site é gerenciado por Git: coloque <Code>llms.txt</Code> na pasta <Code>public/</Code> (Vite/React) ou <Code>static/</Code> (Hugo, SvelteKit) e faça push para o branch publicado.</Step>
              <Step n={2}>Se o deploy é manual (drag-and-drop), abra <Code>app.netlify.com/drop</Code>, adicione o <Code>llms.txt</Code> à pasta do build e arraste a pasta novamente.</Step>
              <Step n={3}>Após o deploy, confirme em <Code>https://seudominio.com/llms.txt</Code>.</Step>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cpanel">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2.5">
              <FolderUp className="h-4 w-4 text-primary" />
              <span>cPanel</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="space-y-3 pt-1">
              <Step n={1}>Acesse o cPanel da sua hospedagem e abra <strong>File Manager</strong>.</Step>
              <Step n={2}>Entre na pasta <Code>public_html/</Code> (raiz do domínio principal) ou na pasta do subdomínio correspondente.</Step>
              <Step n={3}>Clique em <strong>Upload</strong> e envie o <Code>llms.txt</Code>.</Step>
              <Step n={4}>Confirme que a permissão do arquivo é <Code>644</Code> (clique com o botão direito → <em>Change Permissions</em>).</Step>
              <Step n={5}>Valide o acesso público em <Code>https://seudominio.com/llms.txt</Code>.</Step>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="github-pages">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2.5">
              <Github className="h-4 w-4 text-primary" />
              <span>GitHub Pages</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="space-y-3 pt-1">
              <Step n={1}>Adicione o <Code>llms.txt</Code> na raiz do branch publicado (geralmente <Code>main</Code> ou <Code>gh-pages</Code>). Se o site usa Jekyll, garanta que o arquivo não seja ignorado pelo <Code>_config.yml</Code>.</Step>
              <Step n={2}>Commit e push: <Code>git add llms.txt && git commit -m "add llms.txt" && git push</Code>.</Step>
              <Step n={3}>Aguarde 1–2 minutos para a propagação. O arquivo ficará em <Code>https://seudominio.com/llms.txt</Code> (ou <Code>usuario.github.io/repo/llms.txt</Code>).</Step>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
        <Globe className="h-3.5 w-3.5" />
        <span>Não usa nenhuma dessas plataformas? Basta colocar o arquivo na pasta pública (raiz) do seu servidor web.</span>
      </div>
    </Card>
  );
}
