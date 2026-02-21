use anchor_lang::prelude::*;
use anchor_lang::system_program;
use mpl_bubblegum::instructions::{
    CreateTreeConfigV2CpiBuilder, MintV2CpiBuilder, BurnV2CpiBuilder,
};
use mpl_bubblegum::types::{MetadataArgsV2, TokenProgramVersion, TokenStandard, Creator};

declare_id!("Fqqoja5BG9g4mY1mocc8YErH4kdgtzHnM1CrJVzQ5PZZ");

#[program]
pub mod tickto_tickets {
    use super::*;

    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: String,
        _event_name: String,
        _metadata_uri: String,
        _ticket_price_lamports: u64,
        max_supply: u32,
    ) -> Result<()> {
        let event_config = &mut ctx.accounts.event_config;
        event_config.organizer = ctx.accounts.organizer.key();
        event_config.event_id = event_id;
        event_config.bump = ctx.bumps.event_config;
        event_config.merkle_tree = ctx.accounts.merkle_tree.key();
        event_config.max_supply = max_supply;
        event_config.tickets_minted = 0;

        // Create Tree Config (Bubblegum V2)
        // We use the CPI builder pattern
        // Note: The actual Merkle tree account initialization (system program create account + spl-compression init)
        // is expected to be done by the client or a separate instruction if we want to do it all on-chain.
        // However, Bubblegum's create_tree_config requires the tree to be initialized.
        // Here we assume the client checks if tree is initialized, or we do it here.
        // For simplicity, we assume tree account is already created and initialized by client logic
        // OR we can do it here if we add spl-compression CPI.
        // But the task is about Ticket Minting logic. Let's assume standard bubblegum flow.
        
        // Actual CPI to Bubblegum to Create Tree Config
        let tree_config_info = ctx.accounts.tree_config.to_account_info();
        let merkle_tree_info = ctx.accounts.merkle_tree.to_account_info();
        let payer_info = ctx.accounts.organizer.to_account_info();
        let tree_creator_info = event_config.to_account_info();
        let log_wrapper_info = ctx.accounts.log_wrapper.to_account_info();
        let compression_program_info = ctx.accounts.compression_program.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();

        let bubblegum_program_info = ctx.accounts.bubblegum_program.to_account_info();
        let mut cpi_builder = CreateTreeConfigV2CpiBuilder::new(
            &bubblegum_program_info
        );

        cpi_builder
            .tree_config(&tree_config_info)
            .merkle_tree(&merkle_tree_info)
            .payer(&payer_info)
            .tree_creator(Some(&tree_creator_info)) // Wrapped in Some()
            .log_wrapper(&log_wrapper_info)
            .compression_program(&compression_program_info)
            .system_program(&system_program_info)
            .max_depth(17) // 100k+ capacity
            .max_buffer_size(64)
            .public(false) // Only this program (via PDA delegate) can mint
            .invoke_signed(&[&[
                b"event",
                event_config.event_id.as_bytes(),
                &[ctx.bumps.event_config],
            ]])?;

        Ok(())
    }

    pub fn mint_ticket(
        ctx: Context<MintTicket>,
        _event_id: String,
    ) -> Result<()> {
        let event_config = &mut ctx.accounts.event_config;
        
        // Basic check for supply
        if event_config.tickets_minted >= event_config.max_supply {
            return err!(ErrorCode::SoldOut);
        }
        event_config.tickets_minted += 1;

        // Payment logic would go here (transfer SOL from buyer to organizer)
        // Skipped for MVP to focus on Minting

        // Mint cNFT
        // We look up the event metadata
        // In a real app, these would be passed as arguments or stored in EventConfig.
        // For now, we use placeholders or simple data.
        
        let metadata = MetadataArgsV2 {
            name: format!("TiCkTo Event #{}", event_config.event_id),
            symbol: "TICK".to_string(),
            uri: "https://tickto.com/metadata/placeholder".to_string(),
            seller_fee_basis_points: 0,
            primary_sale_happened: false,
            is_mutable: true,
            // Removed: edition_nonce, uses, token_program_version (not in V2)
            token_standard: Some(TokenStandard::NonFungible),
            collection: None, // Can link to a collection NFT here
            creators: vec![Creator {
                address: ctx.accounts.organizer.key(),
                verified: false, // Organizer is not signer here, so can't verify unless we make them signer
                share: 100,
            }],
        };

        // Prepare AccountInfos for CPI to avoid temporary value dropped errors
        let tree_config_info = ctx.accounts.tree_config.to_account_info();
        let leaf_owner_info = ctx.accounts.buyer.to_account_info();
        let leaf_delegate_info = ctx.accounts.buyer.to_account_info();
        let merkle_tree_info = ctx.accounts.merkle_tree.to_account_info();
        let payer_info = ctx.accounts.buyer.to_account_info();
        let tree_creator_or_delegate_info = event_config.to_account_info();
        let log_wrapper_info = ctx.accounts.log_wrapper.to_account_info();
        let compression_program_info = ctx.accounts.compression_program.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();
        
        let bubblegum_program_info = ctx.accounts.bubblegum_program.to_account_info();
        let mut cpi_builder = MintV2CpiBuilder::new(
            &bubblegum_program_info
        );

        cpi_builder
            .tree_config(&tree_config_info)
            .leaf_owner(&leaf_owner_info)
            .leaf_delegate(Some(&leaf_delegate_info)) // Optional
            .merkle_tree(&merkle_tree_info)
            .payer(&payer_info)
            .tree_creator_or_delegate(Some(&tree_creator_or_delegate_info)) // The Event PDA is the delegate
            .log_wrapper(&log_wrapper_info)
            .compression_program(&compression_program_info)
            .system_program(&system_program_info)
            .metadata(metadata)
            .invoke_signed(&[&[
                b"event",
                event_config.event_id.as_bytes(),
                &[event_config.bump], // Use the stored bump directly
            ]])?;

        Ok(())
    }

    pub fn burn_ticket<'info>(
        ctx: Context<'_, '_, '_, 'info, BurnTicket<'info>>, 
        root: [u8; 32],
        data_hash: [u8; 32],
        creator_hash: [u8; 32],
        nonce: u64,
        index: u32,
    ) -> Result<()> {
        // Burn verification logic
        // The LeafOwner (buyer) must sign.
        
        // Prepare AccountInfos
        let bubblegum_program_info = ctx.accounts.bubblegum_program.to_account_info();
        let tree_config_info = ctx.accounts.tree_config.to_account_info();
        let leaf_owner_info = ctx.accounts.leaf_owner.to_account_info();
        let merkle_tree_info = ctx.accounts.merkle_tree.to_account_info();
        let log_wrapper_info = ctx.accounts.log_wrapper.to_account_info();
        let compression_program_info = ctx.accounts.compression_program.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();

        let mut cpi_builder = BurnV2CpiBuilder::new(&bubblegum_program_info);

        cpi_builder
            .tree_config(&tree_config_info)
            .leaf_owner(&leaf_owner_info) // Signer (removed redundant `true` arg)
            .merkle_tree(&merkle_tree_info)
            .log_wrapper(&log_wrapper_info)
            .compression_program(&compression_program_info)
            .system_program(&system_program_info)
            .root(root)
            .data_hash(data_hash)
            .creator_hash(creator_hash)
            .nonce(nonce)
            .index(index);
            
        // Add remaining accounts for proof
        for account in ctx.remaining_accounts.iter() {
            cpi_builder.add_remaining_account(account, false, false);
        }

        cpi_builder.invoke()?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,

    #[account(
        init,
        payer = organizer,
        space = 8 + 32 + 32 + 4 + 8 + 4 + 4, // Adjust space as needed
        seeds = [b"event", event_id.as_bytes()],
        bump
    )]
    pub event_config: Account<'info, EventConfig>,

    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,

    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Metaplex Bubblegum Program ID
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL Account Compression Program ID
    pub compression_program: UncheckedAccount<'info>,
    /// CHECK: SPL Noop Program ID
    pub log_wrapper: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct MintTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Funds destination
    #[account(mut)]
    pub organizer: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"event", event_id.as_bytes()],
        bump = event_config.bump,
    )]
    pub event_config: Account<'info, EventConfig>,

    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,

    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Metaplex Bubblegum Program ID
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL Account Compression Program ID
    pub compression_program: UncheckedAccount<'info>,
    /// CHECK: SPL Noop Program ID
    pub log_wrapper: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BurnTicket<'info> {
    pub leaf_owner: Signer<'info>,

    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,

    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Metaplex Bubblegum Program ID
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL Account Compression Program ID
    pub compression_program: UncheckedAccount<'info>,
    /// CHECK: SPL Noop Program ID
    pub log_wrapper: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct EventConfig {
    pub organizer: Pubkey,
    pub event_id: String, // Limit length?
    pub bump: u8,
    pub merkle_tree: Pubkey,
    pub max_supply: u32,
    pub tickets_minted: u32,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Event sold out")]
    SoldOut,
}
