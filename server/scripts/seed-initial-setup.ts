import "dotenv/config";
import { getDb } from "../db";
import { clinicas, users, clinicSettings } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

/**
 * Script de setup inicial para instalação limpa do sistema.
 * Cria automaticamente:
 * - Clínica provisória com slug "clinica-principal"
 * - Usuário master para consultores (acesso global)
 * - Usuário administrador temporário da clínica
 * - Configurações básicas da clínica
 * 
 * Execute após criar o banco de dados e configurar DATABASE_URL
 */
async function seedInitialSetup() {
  console.log("🚀 Iniciando setup inicial do sistema...");
  
  const db = await getDb();
  if (!db) {
    console.error("❌ Erro: Database não disponível. Verifique DATABASE_URL no .env");
    process.exit(1);
  }

  // Verificar se já existe usuário master (setup idempotente)
  const existingMaster = await db.select().from(users).where(eq(users.role, "master")).limit(1);

  try {
    if (existingMaster.length === 0) {
      console.log("🔐 Criando usuário master para consultores...");
      const masterPassword = "Master@2024SunSet"; // Senha forte para o master
      const masterPasswordHash = await bcrypt.hash(masterPassword, 12);

      const [masterResult] = await db.insert(users).values({
        clinicaId: 0, // 0 = sentinela do acesso global (o banco físico define NOT NULL; o papel 'master' + cookie gerenciam o acesso)
        openId: `local:${nanoid(21)}`,
        name: "Consultor Master SunSet",
        email: "master@livesun.com.br",
        role: "master",
        passwordHash: masterPasswordHash,
        passwordUpdatedAt: new Date(),
        loginMethod: "local",
        ativo: true,
      });
      console.log(`✅ Usuário master criado com ID: ${Number(masterResult.insertId)}`);
    } else {
      console.log(`ℹ️  Usuário master já existe: ${existingMaster[0].email}.`);
    }

    // Clínica provisória (o reutiliza una existente para no duplicar en instalaciones ya pobladas)
    const existingClinic = (await db.select().from(clinicas).orderBy(clinicas.id).limit(1))[0];
    let clinicId: number;
    if (existingClinic) {
      clinicId = existingClinic.id;
      console.log(`ℹ️  Reutilizando clínica existente: "${existingClinic.nome}" (id: ${clinicId}).`);
    } else {
      console.log("📋 Criando clínica provisória...");
      const [clinicResult] = await db.insert(clinicas).values({
        nome: "Clínica Exemplo",
        slug: "clinica-principal", // Slug padrão para o fallback do sistema
        ativa: true,
      });
      clinicId = Number(clinicResult.insertId);
      console.log(`✅ Clínica criada com ID: ${clinicId}`);
    }

    // Configurações da clínica (solo si faltan)
    const existingSettings = await db.select().from(clinicSettings).where(eq(clinicSettings.clinicaId, clinicId)).limit(1);
    if (existingSettings.length === 0) {
      console.log("⚙️  Criando configurações da clínica...");
      await db.insert(clinicSettings).values({
        clinicaId: clinicId,
        nome: "Clínica Exemplo",
        slogan: "Configure sua clínica",
        corPrimaria: "#C8627A",
        corSecundaria: "#8F3B50",
        logoUrl: "/assets/logo-sunset.svg",
      });
      console.log("✅ Configurações criadas");
    } else {
      console.log("ℹ️  Configurações da clínica já existentes.");
    }

    // Usuário gestor da clínica (solo si ainda não existe para não sobrescribir credenciales)
    const existingAdmin = (await db.select().from(users).where(and(eq(users.clinicaId, clinicId), eq(users.role, "admin"))).limit(1))[0];
    if (existingAdmin) {
      console.log(`ℹ️  A clínica ya possui um gestor: ${existingAdmin.email}. Credenciais preservadas.`);
    } else {
      console.log("👤 Criando usuário administrador da clínica...");
      const tempPassword = "Admin123456"; // Senha temporária - deve ser alterada no primeiro acesso
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const [userResult] = await db.insert(users).values({
        clinicaId: clinicId,
        openId: `local:${nanoid(21)}`,
        name: "Administrador",
        email: "admin@clinica-exemplo.com",
        role: "admin",
        passwordHash,
        passwordUpdatedAt: new Date(),
        loginMethod: "local",
        ativo: true,
      });
      console.log(`✅ Usuário administrador criado com ID: ${Number(userResult.insertId)}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 SETUP INICIAL CONCLUÍDO COM SUCESSO!");
    console.log("=".repeat(60));
    console.log("🔐 USUÁRIO MASTER (Acesso Global):");
    console.log(`📍 Email: master@livesun.com.br`);
    console.log(`🔑 Senha: Master@2024SunSet`);
    console.log(`🎯 Função: Acesso a todas as clínicas para configuração e suporte`);
    console.log("=".repeat(60));
    console.log(`📋 Clínica ID: ${clinicId}`);
    console.log(`📋 Nome: ${existingClinic?.nome ?? "Clínica Exemplo"}`);
    console.log(`🔗 Slug: ${existingClinic?.slug ?? "clinica-principal"}`);
    console.log(`🔗 Link de agendamento público: /agendar?clinica=${existingClinic?.slug ?? "clinica-principal"}`);
    if (!existingAdmin) {
      console.log(`👤 Email do admin: admin@clinica-exemplo.com`);
      console.log(`🔑 Senha temporária: Admin123456`);
    }
    console.log("=".repeat(60));
    console.log("⚠️  INSTRUÇÕES IMPORTANTES:");
    console.log("🔐 USUÁRIO MASTER:");
    console.log("1. Use para acessar qualquer ambiente de cliente");
    console.log("2. Tem perfil de gestor em todas as clínicas");
    console.log("3. Pode configurar e gerenciar qualquer clínica");
    console.log("4. Ideal para consultores técnicos e suporte");
    console.log("");
    console.log("👤 USUÁRIO ADMIN DA CLÍNICA:");
    console.log("1. Acesse o sistema com as credenciais acima");
    console.log("2. Altere a senha imediatamente no primeiro acesso");
    console.log("3. Configure o nome real da sua clínica");
    console.log("4. Atualize o slug se desejar um link personalizado");
    console.log("5. Configure logo, cores e outras informações");
    console.log("6. Cadastre serviços, profissionais e questionários");
    console.log("7. Teste o link de agendamento público");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Erro durante o setup inicial:", error);
    process.exit(1);
  }
}

// Executar o setup
seedInitialSetup()
  .then(() => {
    console.log("✅ Setup finalizado.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  });