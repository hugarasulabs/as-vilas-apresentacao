/*
 * Configuração da demonstração — Grupo As Vilas
 * ------------------------------------------------------------
 * Este é o único arquivo que precisa ser editado para trocar os
 * dados da festa, as imagens e as regras de exemplo.
 *
 * Campos marcados com `exemplo: true` aparecem na tela com o selo
 * "Exemplo". Ao receber a informação real, preencha o valor e
 * altere `exemplo` para `false`.
 *
 * Use sempre caminhos RELATIVOS (sem "/" no início) para funcionar
 * no subdiretório do GitHub Pages.
 */
window.AS_VILAS_CONFIG = {
  grupo: {
    nome: 'Grupo As Vilas',
    slogan: 'Momentos que viram memórias',
    // Composição visual usada na apresentação anterior. Substitua pelo
    // arquivo oficial quando disponível (mesmo nome ou altere aqui).
    imagemMarca: 'assets/marcas/grupo-as-vilas.jpg',
    // Site ou perfil oficial. Deixe vazio até o endereço ser validado
    // com o Grupo — enquanto vazio, a chamada aparece sem link.
    siteOficial: 'https://www.instagram.com/buffetviladaalegria/',
    marcas: [
      { id: 'alegria', nome: 'Vila da Alegria', complemento: 'Buffet', logo: '' },
      { id: 'teen', nome: 'Vila Teen', complemento: 'Buffet', logo: '' },
      { id: 'avila', nome: 'A Vila', complemento: 'Buffet', logo: '' },
      { id: 'kids', nome: 'Vila Kids', complemento: 'Buffet', logo: '' }
    ]
  },

  festa: {
    aniversariante: 'Anne',
    // Idade que a aniversariante completa. `null` = não exibir.
    idadeCompleta: null,
    tema: 'Guerreiras do K-pop',
    // Foto real da Anne, fornecida pela família (ex.: 'assets/fotos/anne.jpg').
    // Enquanto vazio, o convite mostra um espaço reservado.
    foto: '',
    mensagem: 'Prepare seu melhor brilho: vai ter música, estrelas e muita energia para celebrar com a Anne!',
    data: { valor: '2026-11-28', exemplo: true },           // AAAA-MM-DD
    horario: { inicio: '15:00', fim: '19:00', exemplo: true },
    local: {
      nome: 'Vila da Alegria Buffet',
      endereco: 'Rua Castelo de Sintra, 1064 - Bairro Castelo, Belo Horizonte - MG, 30840-460',
      exemplo: false
    },
    // Link do convite em vídeo produzido pelo Grupo, se houver.
    videoConvite: ''
  },

  // Regras de EXEMPLO, baseadas em uma experiência relatada.
  // Não representam regras comerciais do Grupo As Vilas.
  regras: {
    isencaoAbaixoDe: 6,       // crianças com menos de N anos: isenção
    lembrancinhaAbaixoDe: 10  // crianças com menos de N anos: lembrancinha
  },

  limiteConvidadosPorResposta: 12
};
