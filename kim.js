$(document).ready(function(){
    $('#cpf').inputmask('999.999.999-99'); // Máscara para CPF
    $('#email').inputmask('aaa@aaa.com'); // Máscara para email
    $('#telefone').inputmask('(99)99999-9999'); // Máscara para Telefone
    $('#cep').inputmask('99999-999'); // Máscara para CEP
    $('#cc').inputmask('9999 9999 9999 9999');
    $('#cod').inputmask('999');
    $('#dataval').inputmask('99/99');



$('#cep').on('blur', function() {
        var cep = $(this).val().replace(/\D/g, '');
        if (cep.length === 8) {
            $.getJSON(`https://viacep.com.br/ws/${cep}/json/`, function(data) {
                if (!("erro" in data)) {
                    $('#rua').val(data.logradouro);
                    $('#bairro').val(data.bairro);
                    $('#cidade').val(data.localidade);
                    $('#estado').val(data.uf);
                } else {
                    alert("CEP não encontrado.");
                    document.getElementById("cep").value="";
                    document.getElementById("cep").focus();
                }
            });
        }
    });	
});